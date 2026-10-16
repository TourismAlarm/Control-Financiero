/**
 * Sincroniza los movimientos de las cuentas vinculadas con la tabla transactions.
 * Solo servidor. La llaman el cron diario y el botón "Sincronizar ahora".
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { autoCategorize } from '@/lib/categorization/autoCategorize';
import { isTransferCategory } from '@/lib/categorization/special';
import { EnableBankingError, getAllTransactions, getBalances } from './enableBanking';
import { classifyKind, fingerprintOf, mapTransaction, normalizeIban, normalizeText, pickBalance } from './transform';
import { matchLoan, merchantKey } from '@/lib/debts/detect';
import { linkPaymentToLoan, loadActiveLoans } from '@/lib/debts/apply';

/**
 * Máximo de días hacia atrás que pedimos. PSD2: pasada la ventana posterior a la autorización,
 * bancos como BBVA solo dan ~90 días y rechazan con 422 ("Wrong transactions period requested")
 * cualquier `date_from` más antiguo. 89 deja margen por zona horaria.
 */
const MAX_DAYS = 89;
/** Margen de solape en sincronizaciones siguientes (movimientos que se contabilizan con retraso). */
const OVERLAP_DAYS = 5;

export interface BankLink {
  id: string;
  user_id: string;
  aspsp_name: string;
  aspsp_country: string;
  account_uid: string;
  iban: string | null;
  account_name: string | null;
  account_id: string | null;
  valid_until: string | null;
  status: string;
  last_synced_at: string | null;
}

export interface LinkSyncResult {
  linkId: string;
  bank: string;
  fetched: number;
  inserted: number;
  balance: number | null;
  internal: number;
  status: 'ok' | 'expired' | 'error';
  error?: string;
}

/** Fecha YYYY-MM-DD en hora de Madrid (la que usan los bancos). */
function isoDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d);
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

async function loadContext(userId: string) {
  const [linksRes, profileRes, loans, categoriesRes, rulesRes] = await Promise.all([
    supabaseAdmin.from('bank_links').select('iban').eq('user_id', userId),
    supabaseAdmin.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    loadActiveLoans(userId),
    supabaseAdmin.from('categories').select('id, name, type').eq('user_id', userId),
    supabaseAdmin.from('category_rules').select('pattern, category_id').eq('user_id', userId),
  ]);

  const ownIbans = new Set(
    (linksRes.data || []).map((l: { iban: string | null }) => normalizeIban(l.iban)).filter(Boolean) as string[]
  );

  // Nombre del perfil + variantes opcionales (p.ej. con segundo apellido) separadas por "|"
  const ownNames = [
    profileRes.data?.full_name as string | undefined,
    ...(process.env.BANK_OWN_NAMES || '').split('|'),
  ].filter((n): n is string => Boolean(n && n.trim()));

  // Para clasificar como pago de deuda: el texto del banco si lo tiene, si no el nombre
  const loanNames = loans.map((l) => l.bank_match || l.contact_name).filter(Boolean);

  // Reglas aprendidas al corregir categorías (vacío si falta la migración 012)
  const learnedRules = new Map<string, string>();
  for (const r of (rulesRes.error ? [] : rulesRes.data || []) as { pattern: string; category_id: string }[]) {
    learnedRules.set(r.pattern, r.category_id);
  }

  const categoryByName = new Map<string, string>();
  const transferCategoryIds = new Set<string>();
  for (const c of (categoriesRes.data || []) as { id: string; name: string; type: string }[]) {
    categoryByName.set(`${c.type}:${normalizeText(c.name)}`, c.id);
    if (isTransferCategory(c.name)) transferCategoryIds.add(c.id);
  }

  return { ownIbans, ownNames, loanNames, loans, learnedRules, categoryByName, transferCategoryIds };
}

export async function syncLink(link: BankLink, ctx?: Awaited<ReturnType<typeof loadContext>>): Promise<LinkSyncResult> {
  const result: LinkSyncResult = { linkId: link.id, bank: link.aspsp_name, fetched: 0, inserted: 0, balance: null, internal: 0, status: 'ok' };

  if (link.valid_until && new Date(link.valid_until) < new Date()) {
    await supabaseAdmin.from('bank_links').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', link.id);
    return { ...result, status: 'expired', error: 'El permiso del banco ha caducado: vuelve a conectarlo' };
  }

  const context = ctx ?? (await loadContext(link.user_id));
  // Movimientos guardados con el nombre enmascarado (***): se vuelven a pedir para repararlos
  const { data: maskedRows } = await supabaseAdmin
    .from('transactions')
    .select('external_id')
    .eq('bank_link_id', link.id)
    .or('description.like.%**%,counterparty.like.%**%')
    .limit(1000);
  const toRepair = new Set((maskedRows || []).map((r: { external_id: string }) => r.external_id));

  // date_from = max(última sync - margen, hoy - 89 días). Sin date_to (el banco usa hoy).
  const oldest = daysAgo(MAX_DAYS);
  const incremental =
    link.last_synced_at && toRepair.size === 0
      ? new Date(new Date(link.last_synced_at).getTime() - OVERLAP_DAYS * 86400000)
      : oldest;
  const from = incremental > oldest ? incremental : oldest;

  try {
    let raw;
    try {
      raw = await getAllTransactions(link.account_uid, isoDate(from));
    } catch (err) {
      // 422 por periodo no permitido: reintento con la ventana máxima segura antes de dar error
      if (err instanceof EnableBankingError && err.status === 422 && from !== oldest) {
        raw = await getAllTransactions(link.account_uid, isoDate(oldest));
      } else {
        throw err;
      }
    }
    result.fetched = raw.length;

    const mapped: (NonNullable<ReturnType<typeof mapTransaction>> & { storedId?: string })[] = raw
      .map((tx) => mapTransaction(tx, link.account_uid))
      .filter((t): t is NonNullable<typeof t> => t !== null);

    // Deduplicado: lo que ya está guardado no se vuelve a insertar.
    // Al reconectar un banco, Enable Banking cambia el uid de la cuenta y con él el
    // external_id: por eso se compara la huella del movimiento dentro de la misma
    // cuenta de la app, no el external_id entero.
    const minDate = mapped.reduce((min, m) => (m.date < min ? m.date : min), '9999-12-31');
    const stored = new Map<string, string>(); // huella → external_id guardado
    if (mapped.length) {
      const pageOf = (page: number) => {
        const q = supabaseAdmin
          .from('transactions')
          .select('external_id')
          .eq('user_id', link.user_id)
          .not('external_id', 'is', null)
          .gte('date', minDate);
        return (link.account_id ? q.eq('account_id', link.account_id) : q.eq('bank_link_id', link.id))
          .order('created_at', { ascending: true })
          .range(page * 1000, page * 1000 + 999);
      };
      for (let page = 0; ; page++) {
        const { data } = await pageOf(page);
        for (const row of (data || []) as { external_id: string }[]) {
          if (!stored.has(fingerprintOf(row.external_id))) stored.set(fingerprintOf(row.external_id), row.external_id);
        }
        if (!data || data.length < 1000) break;
      }
    }
    const existing = new Set<string>();
    for (const m of mapped) {
      const prev = stored.get(fingerprintOf(m.external_id));
      if (prev) {
        existing.add(m.external_id);
        if (toRepair.has(prev)) toRepair.add(m.external_id);
        m.storedId = prev;
      }
    }

    for (const m of mapped) {
      if (!toRepair.has(m.external_id)) continue;
      await supabaseAdmin
        .from('transactions')
        .update({ description: m.description, counterparty: m.counterparty })
        .eq('user_id', link.user_id)
        .eq('external_id', m.storedId ?? m.external_id);
    }

    const seen = new Set<string>();
    const rows = [];
    for (const m of mapped) {
      if (existing.has(m.external_id) || seen.has(m.external_id)) continue;
      seen.add(m.external_id);

      let kind = classifyKind(m, {
        providerName: link.aspsp_name,
        ownIbans: context.ownIbans,
        ownNames: context.ownNames,
        loanNames: context.loanNames,
      });
      // Categoría: primero lo que has enseñado tú, luego las reglas por defecto
      let categoryId: string | null = null;
      if (kind === 'regular') {
        categoryId = context.learnedRules.get(merchantKey(m.counterparty, m.description)) ?? null;
        // Le enseñaste que esto es "Entre cuentas": traspaso
        if (categoryId && context.transferCategoryIds.has(categoryId)) kind = 'internal_transfer';
        if (!categoryId) {
          const categoryName = autoCategorize(m.description);
          categoryId = categoryName
            ? context.categoryByName.get(`${m.type}:${normalizeText(categoryName)}`) ?? null
            : null;
        }
      }

      if (kind === 'internal_transfer') result.internal++;

      const loanId =
        kind === 'debt_payment' ? matchLoan(`${m.counterparty ?? ''} ${m.description}`, context.loans) : null;

      rows.push({
        user_id: link.user_id,
        account_id: link.account_id,
        category_id: categoryId,
        type: m.type,
        amount: m.amount,
        description: m.description,
        date: m.date,
        external_id: m.external_id,
        counterparty: m.counterparty,
        kind,
        source: 'bank_sync',
        bank_link_id: link.id,
        // Solo existe con la migración 012; si no hay deuda no se envía la columna
        ...(loanId ? { loan_id: loanId } : {}),
      });
    }

    const insertedRows: { id: string; amount: number; date: string; loan_id?: string | null }[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await supabaseAdmin.from('transactions').insert(rows.slice(i, i + 500)).select('*');
      if (error) throw new Error(`Error guardando movimientos: ${error.message}`);
      insertedRows.push(...((data || []) as typeof insertedRows));
    }
    result.inserted = rows.length;

    // Pagos de deudas: se apuntan solos y bajan lo pendiente
    for (const row of insertedRows) {
      const loan = row.loan_id ? context.loans.find((l) => l.id === row.loan_id) : undefined;
      if (loan) await linkPaymentToLoan(loan, { id: row.id, amount: Number(row.amount), date: row.date });
    }

    // Saldo actual de la cuenta. Si el banco no lo da, no rompemos la sincronización.
    if (link.account_id) {
      try {
        const balance = pickBalance(await getBalances(link.account_uid));
        if (balance !== null) {
          await supabaseAdmin
            .from('accounts')
            .update({ balance, updated_at: new Date().toISOString() })
            .eq('id', link.account_id)
            .eq('user_id', link.user_id);
          result.balance = balance;
        }
      } catch (err) {
        console.warn(`⚠️ Saldo no disponible (${link.aspsp_name}):`, err instanceof Error ? err.message : err);
      }
    }

    await supabaseAdmin
      .from('bank_links')
      .update({ status: 'active', last_synced_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq('id', link.id);

    return result;
  } catch (err) {
    const expired = err instanceof EnableBankingError && (err.status === 401 || err.status === 403);
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('bank_links')
      .update({ status: expired ? 'expired' : 'error', last_error: message.substring(0, 500), updated_at: new Date().toISOString() })
      .eq('id', link.id);
    return { ...result, status: expired ? 'expired' : 'error', error: message };
  }
}

/** Sincroniza todas las cuentas activas de un usuario (o de todos si no se pasa userId). */
export async function syncAll(userId?: string): Promise<LinkSyncResult[]> {
  let query = supabaseAdmin.from('bank_links').select('*').in('status', ['active', 'error']);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const links = (data || []) as BankLink[];
  const results: LinkSyncResult[] = [];
  const contexts = new Map<string, Awaited<ReturnType<typeof loadContext>>>();

  // Secuencial: pocas cuentas y así no saturamos la API del agregador
  for (const link of links) {
    if (!contexts.has(link.user_id)) contexts.set(link.user_id, await loadContext(link.user_id));
    results.push(await syncLink(link, contexts.get(link.user_id)));
  }
  return results;
}
