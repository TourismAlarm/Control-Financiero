import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadAccounts } from '@/lib/accounts/load';
import type { AccountRole } from '@/lib/accounts/roles';
import { computeFlow, isOwnSpending, nextPayday, type FlowTx } from '@/lib/summary/flow';

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

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}`, days: last, y, m };
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/summary?month=YYYY-MM — todo lo que necesita la pantalla de Inicio
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureProfile(session);
  const userId = session.user.id;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const qMonth = new URL(request.url).searchParams.get('month');
  const month = qMonth && /^\d{4}-\d{2}$/.test(qMonth) ? qMonth : currentMonth;
  const { start, end, days } = monthBounds(month);
  const isCurrent = month === currentMonth;
  const dayOfMonth = isCurrent ? now.getDate() : days;

  const histStart = monthBounds(shiftMonth(month, -3)).start;

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

  const all = (txRes.data || []) as Tx[];
  const inMonth = all.filter((t) => t.date >= start && t.date <= end);
  const asFlow = (t: Tx): FlowTx => ({ ...t, amount: Number(t.amount), kind: t.kind ?? null });

  // Reparto del mes según el papel de cada cuenta
  const flow = computeFlow(inMonth.map(asFlow), roleOf, linkedRoles);

  // En qué se va: solo tu gasto (la cuenta de casa va aparte)
  const ownSpending = inMonth.filter((t) => isOwnSpending(asFlow(t), roleOf));
  const byCategory = new Map<string, { id: string | null; name: string; amount: number }>();
  for (const t of ownSpending) {
    const key = t.category?.id || 'none';
    const prev = byCategory.get(key) || { id: t.category?.id || null, name: t.category?.name || 'Sin categoría', amount: 0 };
    prev.amount += Number(t.amount);
    byCategory.set(key, prev);
  }

  // Media de lo gastado hasta el mismo día en los 3 meses anteriores (solo meses con datos)
  const previous: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const pm = shiftMonth(month, -i);
    const b = monthBounds(pm);
    const cutoff = `${pm}-${String(Math.min(dayOfMonth, b.days)).padStart(2, '0')}`;
    const monthTx = all.filter((t) => t.date >= b.start && t.date <= b.end);
    if (monthTx.length === 0) continue;
    previous.push(
      monthTx.filter((t) => t.date <= cutoff && isOwnSpending(asFlow(t), roleOf)).reduce((s, t) => s + Number(t.amount), 0)
    );
  }
  const average = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : null;

  const uncategorized = ownSpending.filter((t) => !t.category_id);

  // Lo que te queda: saldo de la(s) cuenta(s) del día a día, y cuánto toca por día hasta la nómina
  const daily = accounts.filter((a) => a.role === 'daily');
  const remaining = daily.length ? round(daily.reduce((s, a) => s + a.balance, 0)) : null;
  const dailyIds = new Set(daily.map((a) => a.id));
  const payday = isCurrent
    ? nextPayday(
        all
          .filter((t) => t.type === 'income' && (t.kind || 'regular') === 'regular' && (dailyIds.size ? dailyIds.has(t.account_id || '') : roleOf(t.account_id) !== 'home'))
          .map((t) => ({ date: t.date, amount: Number(t.amount) })),
        now
      )
    : null;

  const lastSync = accounts.map((a) => a.lastSync).filter(Boolean).sort().pop() || null;

  // Próximo pago de deuda
  const today = now.getDate();
  const nextPayment = ((loansRes.data || []) as any[])
    .filter((l) => l.payment_day && Number(l.monthly_payment) > 0)
    .map((l) => {
      const day = Number(l.payment_day);
      const d = day >= today
        ? new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()))
        : new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
      return { name: l.contact_name as string, amount: Number(l.monthly_payment), date: d.toISOString().substring(0, 10) };
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

  return NextResponse.json({
    month,
    isCurrent,
    dayOfMonth,
    daysInMonth: days,
    remaining,
    payday,
    perDay: remaining !== null && payday ? round(Math.max(0, remaining) / payday.daysLeft) : null,
    accounts: accounts.map(({ id, name, balance, role, guessed, linked, lastSync: synced }) => ({ id, name, balance, role, guessed, linked, lastSync: synced })),
    rolesMigrated,
    flow,
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
