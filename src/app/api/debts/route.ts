import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectRecurringDebts, matchLoan, type TxForDetection } from '@/lib/debts/detect';
import { linkPaymentToLoan, type LoanState } from '@/lib/debts/apply';

const DETECTION_DAYS = 150;

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
    return NextResponse.json({ migrated: false, loans: [], suggestions: [], accounts: [] });
  }

  const [loansRes, txRes, dismissedRes, accountsRes] = await Promise.all([
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
    supabaseAdmin.from('accounts').select('id, name').eq('user_id', userId),
  ]);

  if (loansRes.error) return NextResponse.json({ error: loansRes.error.message }, { status: 500 });

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
    return {
      id: l.id,
      name: l.contact_name,
      bank_match: l.bank_match,
      status: l.status,
      outstanding,
      principal,
      monthly_payment: monthly || null,
      payment_day: l.payment_day,
      interest_rate: Number(l.interest_rate) || 0,
      account_id: l.account_id,
      progress: principal > 0 ? Math.max(0, Math.min(1, 1 - outstanding / principal)) : 0,
      months_left: monthly > 0 ? Math.ceil(outstanding / monthly) : null,
      last_payment: payments[0] ? { date: payments[0].payment_date, amount: Number(payments[0].amount) } : null,
      paid_this_month: paidThisMonth,
      late,
    };
  });

  const suggestions = detectRecurringDebts(
    ((txRes.data || []) as any[]).map((t) => ({ ...t, amount: Number(t.amount) })) as TxForDetection[],
    {
      exclude: new Set((dismissedRes.data || []).map((d: { key: string }) => d.key)),
      existingMatches: loans.map((l) => l.bank_match || '').filter(Boolean),
    }
  ).slice(0, 5);

  return NextResponse.json({ migrated: true, loans, suggestions, accounts: accountsRes.data || [] });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bank_match: z.string().trim().min(3).max(60),
  monthly_payment: z.number().positive(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  outstanding: z.number().positive(),
  interest_rate: z.number().min(0).max(100).optional(),
  account_id: z.string().uuid().nullable().optional(),
});

// POST /api/debts — crea la deuda y le enlaza los pagos que ya están en el banco
export async function POST(request: NextRequest) {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los datos: nombre, texto del banco, cuota y lo pendiente' }, { status: 400 });
  }
  const d = parsed.data;
  const today = new Date();
  const due = new Date(today);
  due.setMonth(due.getMonth() + Math.ceil(d.outstanding / d.monthly_payment));

  const { data: loan, error } = await supabaseAdmin
    .from('loans')
    .insert({
      user_id: userId,
      type: 'borrowed',
      contact_name: d.name,
      bank_match: d.bank_match,
      principal_amount: d.outstanding, // el original no lo sabemos: el progreso cuenta desde hoy
      outstanding_amount: d.outstanding,
      interest_rate: d.interest_rate ?? 0,
      monthly_payment: d.monthly_payment,
      payment_day: d.payment_day ?? null,
      account_id: d.account_id ?? null,
      start_date: today.toISOString().substring(0, 10),
      due_date: due.toISOString().substring(0, 10),
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
  bank_match: z.string().trim().min(3).max(60).optional(),
  monthly_payment: z.number().positive().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  outstanding: z.number().min(0).optional(),
});

// PATCH /api/debts — corregir datos (p. ej. lo pendiente)
export async function PATCH(request: NextRequest) {
  const userId = await auth();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
  const { id, name, outstanding, ...rest } = parsed.data;

  const update: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (name !== undefined) update.contact_name = name;
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
