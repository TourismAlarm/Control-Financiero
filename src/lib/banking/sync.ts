/**
 * Sincroniza los movimientos de las cuentas vinculadas con la tabla transactions.
 * Solo servidor. La llaman el cron diario y el botón "Sincronizar ahora".
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { autoCategorize } from '@/lib/categorization/autoCategorize';
import { EnableBankingError, getAllTransactions, getBalances } from './enableBanking';
import { classifyKind, mapTransaction, normalizeIban, normalizeText, pickBalance } from './transform';

/** Primera sincronización: cuántos días hacia atrás. Los bancos suelen dar 90 días sin volver a autenticar. */
const INITIAL_DAYS = 90;
/** Margen de solape en sincronizaciones siguientes (movimientos que se contabilizan con retraso). */
const OVERLAP_DAYS = 7;

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

function isoDate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

async function loadContext(userId: string) {
  const [linksRes, profileRes, loansRes, categoriesRes] = await Promise.all([
    supabaseAdmin.from('bank_links').select('iban').eq('user_id', userId),
    supabaseAdmin.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('loans').select('contact_name').eq('user_id', userId),
    supabaseAdmin.from('categories').select('id, name, type').eq('user_id', userId),
  ]);

  const ownIbans = new Set(
    (linksRes.data || []).map((l: { iban: string | null }) => normalizeIban(l.iban)).filter(Boolean) as string[]
  );

  // Nombre del perfil + variantes opcionales (p.ej. con segundo apellido) separadas por "|"
  const ownNames = [
    profileRes.data?.full_name as string | undefined,
    ...(process.env.BANK_OWN_NAMES || '').split('|'),
  ].filter((n): n is string => Boolean(n && n.trim()));

  const loanNames = (loansRes.data || [])
    .map((l: { contact_name: string | null }) => l.contact_name || '')
    .filter(Boolean);

  const categoryByName = new Map<string, string>();
  for (const c of (categoriesRes.data || []) as { id: string; name: string; type: string }[]) {
    categoryByName.set(`${c.type}:${normalizeText(c.name)}`, c.id);
  }

  return { ownIbans, ownNames, loanNames, categoryByName };
}

export async function syncLink(link: BankLink, ctx?: Awaited<ReturnType<typeof loadContext>>): Promise<LinkSyncResult> {
  const result: LinkSyncResult = { linkId: link.id, bank: link.aspsp_name, fetched: 0, inserted: 0, balance: null, internal: 0, status: 'ok' };

  if (link.valid_until && new Date(link.valid_until) < new Date()) {
    await supabaseAdmin.from('bank_links').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', link.id);
    return { ...result, status: 'expired', error: 'El permiso del banco ha caducado: vuelve a conectarlo' };
  }

  const context = ctx ?? (await loadContext(link.user_id));
  const from = link.last_synced_at
    ? new Date(new Date(link.last_synced_at).getTime() - OVERLAP_DAYS * 86400000)
    : new Date(Date.now() - INITIAL_DAYS * 86400000);

  try {
    const raw = await getAllTransactions(link.account_uid, isoDate(from));
    result.fetched = raw.length;

    const mapped = raw
      .map((tx) => mapTransaction(tx, link.account_uid))
      .filter((t): t is NonNullable<typeof t> => t !== null);

    // Deduplicado: lo que ya está guardado no se vuelve a insertar
    const ids = Array.from(new Set(mapped.map((m) => m.external_id)));
    const existing = new Set<string>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabaseAdmin
        .from('transactions')
        .select('external_id')
        .eq('user_id', link.user_id)
        .in('external_id', ids.slice(i, i + 200));
      for (const row of data || []) existing.add((row as { external_id: string }).external_id);
    }

    const seen = new Set<string>();
    const rows = [];
    for (const m of mapped) {
      if (existing.has(m.external_id) || seen.has(m.external_id)) continue;
      seen.add(m.external_id);

      const kind = classifyKind(m, {
        providerName: link.aspsp_name,
        ownIbans: context.ownIbans,
        ownNames: context.ownNames,
        loanNames: context.loanNames,
      });
      if (kind === 'internal_transfer') result.internal++;

      const categoryName = kind === 'regular' ? autoCategorize(m.description) : null;
      const categoryId = categoryName
        ? context.categoryByName.get(`${m.type}:${normalizeText(categoryName)}`) ?? null
        : null;

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
      });
    }

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from('transactions').insert(rows.slice(i, i + 500));
      if (error) throw new Error(`Error guardando movimientos: ${error.message}`);
    }
    result.inserted = rows.length;

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
