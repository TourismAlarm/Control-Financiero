import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectRecurringDebts, matchLoan, type TxForDetection } from '@/lib/debts/detect';
import { linkPaymentToLoan, type LoanState } from '@/lib/debts/apply';
import { loadAccounts } from '@/lib/accounts/load';

const DETECTION_DAYS = 150;

function monthsUntil(isoDate: string, from = new Date()): number {
  const [y, m] = isoDate.split('-').map(Number) as [number, number];
  return Math.max(0, (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth()) + 1);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().substring(0, 10);
}

async function auth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await ensureProfile(session);
  return session.user.id;
}

// GET /api/debts — deudas con su estado + pagos que parecen deudas
export async function GET() {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // ¿Está aplicada la migración 012?
  const probe = await supabaseAdmin.from('loans').select('id, bank_match').limit(1);
  if (probe.error) {
    console.error('❌ /api/debts (¿falta la migración 012?):', probe.error.message);
    return NextResponse.json({ migrated: false, detail: probe.error.message, loans: [], suggestions: [], accounts: [] });
  }

  const [loansRes, txRes, dismissedRes, accountsData] = await Promise.all([
    supabaseAdmin
      .from('loans')
      .select('*, loan_payments(id, amount, payment_date, transaction_id)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('transactions')
      .select('id, date, amount, description, counterparty, account_id')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .in('kind', ['regular', 'debt_payment'])
      .is('loan_id', null)
      .gte('date', daysAgo(DETECTION_DAYS)),
    supabaseAdmin.from('dismissed_suggestions').select('key').eq('user_id', userId),
    loadAccounts(userId),
  ]);
  const { accounts } = accountsData;

  if (loansRes.error) {
    console.error('❌ /api/debts loans:', loansRes.error.message);
    return NextResponse.json({ error: loansRes.error.message }, { status: 500 });
  }
  if (txRes.error) console.error('❌ /api/debts transactions:', txRes.error.message);

  const today = new Date();
  const thisMonth = today.toISOString().substring(0, 7);
  const loans = (loansRes.data || []).map((l: any) => {
    const payments = [...(l.loan_payments || [])].sort((a: any, b: any) =>
      String(b.payment_date).localeCompare(String(a.payment_date))
    );
    const paidThisMonth = payments.some((p: any) => String(p.payment_date).startsWith(thisMonth));
    const late =
      l.status === 'active' &&
      l.payment_day != null &&
      !paidThisMonth &&
      today.getDate() > Math.min(28, Number(l.payment_day)) + 3;
    const principal = Number(l.principal_amount) || 0;
    const outstanding = Number(l.outstanding_amount) || 0;
    const monthly = Number(l.monthly_payment) || 0;
    // Cuotas que quedan: por la fecha de fin si la sabes; si no, por lo pendiente
    const monthsLeft = l.due_date ? Math.max(0, monthsUntil(String(l.due_date)) - (paidThisMonth ? 1 : 0)) : monthly > 0 ? Math.ceil(outstanding / monthly) : null;
    const endDate = l.due_date
      ? String(l.due_date).substring(0, 10)
      : monthsLeft
        ? new Date(today.getFullYear(), today.getMonth() + monthsLeft, 1).toISOString().substring(0, 10)
        : null;
    const toPay = monthly > 0 && monthsLeft ? Math.round(monthly * monthsLeft * 100) / 100 : null;
    return {
      id: l.id,
      name: l.contact_name,
      lender: l.bank_match,
      status: l.status,
      outstanding,
      original: principal,
      paid: Math.max(0, Math.round((principal - outstanding) * 100) / 100),
      monthly_payment: monthly || null,
      payment_day: l.payment_day,
      interest_rate: Number(l.interest_rate) || 0,
      account_id: l.account_id,
      due_date: l.due_date ? String(l.due_date).substring(0, 10) : null,
      end_date: endDate,
      end_is_estimate: !l.due_date,
      progress: principal > 0 ? Math.max(0, Math.min(1, 1 - outstanding / principal)) : 0,
      months_left: monthsLeft,
      // Lo que pagarás aún en cuotas, y cuánto de eso son intereses
      to_pay: toPay,
      interest_left: toPay !== null && toPay > outstanding ? Math.round((toPay - outstanding) * 100) / 100 : null,
      last_payment: payments[0] ? { date: payments[0].payment_date, amount: Number(payments[0].amount) } : null,
      paid_this_month: paidThisMonth,
      late,
    };
  });

  const suggestions = detectRecurringDebts(
    ((txRes.data || []) as any[]).map((t) => ({ ...t, amount: Number(t.amount) })) as TxForDetection[],
    {
      exclude: new Set((dismissedRes.data || []).map((d: { key: string }) => d.key)),
      existingMatches: loans.map((l) => l.lender || '').filter(Boolean),
    }
  ).slice(0, 5);

  // ¿La cuenta de deudas tiene para lo que queda por cobrar este mes?
  const debtsAccount = accounts.find((a) => a.role === 'debts') || null;
  const pendingThisMonth = loans
    .filter((l) => l.status === 'active' && !l.paid_this_month && l.monthly_payment)
    .reduce((s, l) => s + (l.monthly_payment || 0), 0);

  return NextResponse.json({
    migrated: true,
    loans,
    suggestions,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    debtsAccount: debtsAccount ? { id: debtsAccount.id, name: debtsAccount.name, balance: debtsAccount.balance } : null,
    pendingThisMonth: Math.round(pendingThisMonth * 100) / 100,
  });
}

const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/)
  .transform((v) => (v.length === 7 ? `${v}-01` : v));

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  lender: z.string().trim().min(3).max(60),
  original: z.number().positive().nullable().optional(),
  outstanding: z.number().positive(),
  monthly_payment: z.number().positive(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  due_date: dueDate.nullable().optional(),
  interest_rate: z.number().min(0).max(100).nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

// POST /api/debts — crea la deuda y le enlaza los pagos que ya están en el banco
export async function POST(request: NextRequest) {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los datos: nombre, quién te lo cobra, cuota y lo que queda' }, { status: 400 });
  }
  const d = parsed.data;
  const today = new Date();
  const due = new Date(today);
  due.setMonth(due.getMonth() + Math.ceil(d.outstanding / d.monthly_payment));
  // Por defecto, la deuda se paga desde la cuenta de deudas (Revolut)
  const accountId = d.account_id ?? (await loadAccounts(userId)).accounts.find((a) => a.role === 'debts')?.id ?? null;

  const { data: loan, error } = await supabaseAdmin
    .from('loans')
    .insert({
      user_id: userId,
      type: 'borrowed',
      contact_name: d.name,
      bank_match: d.lender,
      // Sin importe original, el progreso cuenta desde hoy
      principal_amount: Math.max(d.original ?? d.outstanding, d.outstanding),
      outstanding_amount: d.outstanding,
      interest_rate: d.interest_rate ?? 0,
      monthly_payment: d.monthly_payment,
      payment_day: d.payment_day ?? null,
      account_id: accountId,
      start_date: today.toISOString().substring(0, 10),
      due_date: d.due_date ?? due.toISOString().substring(0, 10),
      status: 'active',
    })
    .select('*')
    .single();
  if (error || !loan) return NextResponse.json({ error: error?.message || 'No se pudo crear' }, { status: 500 });

  // Historial: los pagos que ya había en el banco se enlazan, sin bajar lo pendiente
  const { data: past } = await supabaseAdmin
    .from('transactions')
    .select('id, date, amount, description, counterparty')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .is('loan_id', null)
    .gte('date', daysAgo(400));

  const state: LoanState = {
    id: loan.id,
    user_id: userId,
    bank_match: loan.bank_match,
    contact_name: loan.contact_name,
    outstanding_amount: Number(loan.outstanding_amount),
    interest_rate: Number(loan.interest_rate) || 0,
    status: loan.status,
    created_at: loan.created_at,
  };
  let linked = 0;
  for (const t of (past || []) as any[]) {
    if (!matchLoan(`${t.counterparty ?? ''} ${t.description ?? ''}`, [state])) continue;
    await supabaseAdmin
      .from('transactions')
      .update({ kind: 'debt_payment', loan_id: loan.id, category_id: null })
      .eq('id', t.id)
      .eq('user_id', userId);
    if ((await linkPaymentToLoan(state, { id: t.id, amount: Number(t.amount), date: t.date }, { affectsBalance: false })) === 'linked') {
      linked++;
    }
  }

  return NextResponse.json({ id: loan.id, linked }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  lender: z.string().trim().min(3).max(60).optional(),
  original: z.number().positive().optional(),
  monthly_payment: z.number().positive().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  outstanding: z.number().min(0).optional(),
  due_date: dueDate.nullable().optional(),
  interest_rate: z.number().min(0).max(100).nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

// PATCH /api/debts — corregir datos (p. ej. lo pendiente)
export async function PATCH(request: NextRequest) {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
  const { id, name, outstanding, lender, original, interest_rate, ...rest } = parsed.data;

  const update: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (name !== undefined) update.contact_name = name;
  if (lender !== undefined) update.bank_match = lender;
  if (interest_rate !== undefined) update.interest_rate = interest_rate ?? 0;
  if (original !== undefined) update.principal_amount = Math.max(original, outstanding ?? 0);
  if (outstanding !== undefined) {
    update.outstanding_amount = outstanding;
    update.status = outstanding === 0 ? 'paid' : 'active';
  }

  const { error } = await supabaseAdmin.from('loans').update(update).eq('id', id).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/debts?id= — borra la deuda; sus movimientos vuelven a ser gasto normal
export async function DELETE(request: NextRequest) {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Falta la deuda' }, { status: 400 });
  }

  await supabaseAdmin
    .from('transactions')
    .update({ kind: 'regular', loan_id: null })
    .eq('loan_id', id)
    .eq('user_id', userId);
  const { error } = await supabaseAdmin.from('loans').delete().eq('id', id).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
