import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadAccounts } from '@/lib/accounts/load';
import type { AccountRole } from '@/lib/accounts/roles';
import { computeFlow, isSpending, nextPayday, shareOf, type FlowTx } from '@/lib/summary/flow';
import { fingerprintOf } from '@/lib/banking/transform';

/** Gastos de la cuenta conjunta: pagáis a medias */
const HOME_SHARE = 0.5;
import { daysUntil, dayInPeriod, monthOfDate, normalizeStartDay, periodLabel, periodOf, sameHeight, shiftMonth, todayIso } from '@/lib/period';

interface Tx {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number | string;
  kind?: string | null;
  description: string | null;
  counterparty?: string | null;
  account_id: string | null;
  category_id: string | null;
  category?: { id: string; name: string } | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

// GET /api/summary?month=YYYY-MM — todo lo que necesita la pantalla de Inicio.
// "month" es el mes financiero: con día de cobro 26, octubre = 26 sep – 25 oct.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureProfile(session);
  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('financial_month_start_day')
    .eq('id', userId)
    .maybeSingle();
  const startDay = normalizeStartDay((profile as { financial_month_start_day?: number } | null)?.financial_month_start_day);

  const now = new Date();
  const today = todayIso(now);
  const currentMonth = monthOfDate(today, startDay);
  const qMonth = new URL(request.url).searchParams.get('month');
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : currentMonth;
  const period = periodOf(month, startDay);
  const { start, end } = period;
  const isCurrent = month === currentMonth;
  const dayIndex = isCurrent ? dayInPeriod(period, today) : period.days;

  const histStart = periodOf(shiftMonth(month, -3), startDay).start;

  const [txRes, accountsData, loansRes, categoriesRes] = await Promise.all([
    supabaseAdmin
      .from('transactions')
      .select('*, category:categories(id, name)')
      .eq('user_id', userId)
      .gte('date', histStart)
      .lte('date', end)
      .order('date', { ascending: false }),
    loadAccounts(userId),
    supabaseAdmin.from('loans').select('*').eq('user_id', userId).eq('status', 'active'),
    supabaseAdmin.from('categories').select('id, name, type').eq('user_id', userId).order('name'),
  ]);

  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 });

  const { accounts, rolesMigrated } = accountsData;
  const roleById = new Map(accounts.map((a) => [a.id, a.role]));
  const roleOf = (id: string | null): AccountRole | null => (id ? roleById.get(id) ?? null : null);
  const linkedRoles = new Set(accounts.filter((a) => a.linked && a.role).map((a) => a.role as AccountRole));

  // Por si quedan duplicados de reconectar el banco: un movimiento por cuenta y huella
  const seen = new Set<string>();
  const all = ((txRes.data || []) as (Tx & { external_id?: string | null })[]).filter((t) => {
    if (!t.external_id) return true;
    const key = `${t.account_id}|${fingerprintOf(t.external_id)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const inMonth = all.filter((t) => t.date >= start && t.date <= end);
  const asFlow = (t: Tx): FlowTx => ({ ...t, amount: Number(t.amount), kind: t.kind ?? null });

  // Gasto real por cuenta y traspasos del mes
  const flow = computeFlow(inMonth.map(asFlow), roleOf, linkedRoles, HOME_SHARE);

  // En qué se va: todo tu gasto real (de la conjunta, tu mitad)
  const notSpending = new Set(flow.transferIds);
  const ownSpending = inMonth.filter((t) => isSpending(asFlow(t)) && !notSpending.has(t.id));
  const byCategory = new Map<string, { id: string | null; name: string; amount: number }>();
  for (const t of ownSpending) {
    const isDebt = (t.kind || 'regular') === 'debt_payment';
    const key = isDebt ? 'debts' : t.category?.id || 'none';
    const name = isDebt ? 'Cuotas de deudas' : t.category?.name || 'Sin categoría';
    const prev = byCategory.get(key) || { id: isDebt ? null : t.category?.id || null, name, amount: 0 };
    prev.amount += Number(t.amount) * shareOf(asFlow(t), roleOf, HOME_SHARE);
    byCategory.set(key, prev);
  }

  // Media de lo gastado hasta la misma altura del mes en los 3 meses anteriores (solo meses con datos)
  const previous: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const pp = periodOf(shiftMonth(month, -i), startDay);
    const cutoff = sameHeight(pp, dayIndex);
    const monthTx = all.filter((t) => t.date >= pp.start && t.date <= pp.end);
    if (monthTx.length === 0) continue;
    previous.push(computeFlow(monthTx.filter((t) => t.date <= cutoff).map(asFlow), roleOf, linkedRoles, HOME_SHARE).spent);
  }
  const average = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : null;

  const uncategorized = ownSpending.filter((t) => (t.kind || 'regular') === 'regular' && !t.category_id);

  // Lo que te queda: saldo de la(s) cuenta(s) del día a día, y cuánto toca por día hasta la nómina
  const daily = accounts.filter((a) => a.role === 'daily');
  const remaining = daily.length ? round(daily.reduce((s, a) => s + a.balance, 0)) : null;
  const dailyIds = new Set(daily.map((a) => a.id));
  // Próxima nómina: el día de cobro de Ajustes; si no hay (día 1), el del último ingreso grande
  let payday: { day: number; date: string; daysLeft: number } | null = null;
  if (isCurrent) {
    if (startDay > 1) {
      const next = periodOf(shiftMonth(month, 1), startDay).start;
      payday = { day: startDay, date: next, daysLeft: daysUntil(today, next) };
    } else {
      payday = nextPayday(
        all
          .filter((t) => t.type === 'income' && (t.kind || 'regular') === 'regular' && (dailyIds.size ? dailyIds.has(t.account_id || '') : roleOf(t.account_id) !== 'home'))
          .map((t) => ({ date: t.date, amount: Number(t.amount) })),
        now
      );
    }
  }

  const lastSync = accounts.map((a) => a.lastSync).filter(Boolean).sort().pop() || null;

  // Próximo pago de deuda
  const todayDay = now.getDate();
  const nextPayment = ((loansRes.data || []) as any[])
    .filter((l) => l.payment_day && Number(l.monthly_payment) > 0)
    .map((l) => {
      const day = Number(l.payment_day);
      const d = day >= todayDay
        ? new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()))
        : new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
      return { name: l.contact_name as string, amount: Number(l.monthly_payment), date: d.toISOString().substring(0, 10) };
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

  return NextResponse.json({
    month,
    isCurrent,
    startDay,
    period: { start, end, days: period.days, label: periodLabel(period) },
    dayIndex,
    remaining,
    payday,
    perDay: remaining !== null && payday ? round(Math.max(0, remaining) / payday.daysLeft) : null,
    accounts: accounts.map(({ id, name, balance, role, guessed, linked, lastSync: synced }) => ({ id, name, balance, role, guessed, linked, lastSync: synced })),
    rolesMigrated,
    flow: {
      income: flow.income,
      spent: flow.spent,
      debtsPaid: flow.debtsPaid,
      invested: flow.invested,
      moved: flow.moved,
      byAccount: flow.byAccount.map((s) => {
        const acc = accounts.find((a) => a.id === s.accountId);
        return { name: acc?.name || 'Sin cuenta', role: acc?.role ?? null, amount: s.amount, debts: s.debts, total: s.total };
      }),
    },
    average: average === null ? null : round(average),
    lastSync,
    topCategories: [...byCategory.values()].sort((a, b) => b.amount - a.amount).slice(0, 5).map((c) => ({ ...c, amount: round(c.amount) })),
    uncategorized: {
      count: uncategorized.length,
      first: uncategorized[0]
        ? {
            id: uncategorized[0].id,
            description:
              (uncategorized[0].counterparty && !/^[\s*•·xX0-9-]*$/.test(uncategorized[0].counterparty)
                ? uncategorized[0].counterparty
                : (uncategorized[0].description || '').replace(/[*•]{2,}[0-9]*/g, ' ').replace(/^[\s·-]+|[\s·-]+$/g, '').trim()) ||
              'Movimiento bancario',
            amount: Number(uncategorized[0].amount),
            date: uncategorized[0].date,
            account: accounts.find((a) => a.id === uncategorized[0]!.account_id)?.name || null,
          }
        : null,
    },
    expenseCategories: ((categoriesRes.data || []) as { id: string; name: string; type: string }[])
      .filter((c) => c.type === 'expense')
      .map((c) => ({ id: c.id, name: c.name })),
    nextPayment,
  });
}
