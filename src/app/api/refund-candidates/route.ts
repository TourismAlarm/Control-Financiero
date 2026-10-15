import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Días hacia atrás en los que se buscan gastos que te puedan devolver */
const WINDOW_DAYS = 90;

/**
 * GET /api/refund-candidates?id=<ingreso> — gastos que te pueden estar devolviendo:
 * de los 90 días anteriores, que costaron al menos lo que te devuelven.
 * Primero los del mismo importe y la misma cuenta.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el movimiento' }, { status: 400 });

  const { data: refund } = await supabaseAdmin
    .from('transactions')
    .select('id, date, amount, account_id, type')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!refund) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

  const amount = Number(refund.amount);
  const until = String(refund.date).substring(0, 10);
  const from = new Date(Date.parse(`${until}T12:00:00Z`) - WINDOW_DAYS * 86400000).toISOString().substring(0, 10);

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('id, date, amount, description, counterparty, account_id, category:categories(id, name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('kind', 'regular')
    .gte('date', from)
    .lte('date', until)
    .gte('amount', amount - 0.01)
    .order('date', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const score = (t: { amount: number | string; account_id: string | null }) =>
    (Math.abs(Number(t.amount) - amount) <= 0.01 ? 2 : 0) + (t.account_id === refund.account_id ? 1 : 0);
  const sorted = (data || [])
    .map((t, i) => ({ t, i }))
    .sort((a, b) => score(b.t) - score(a.t) || a.i - b.i)
    .slice(0, 40)
    .map(({ t }) => ({ ...t, amount: Number(t.amount), exact: Math.abs(Number(t.amount) - amount) <= 0.01 }));

  return NextResponse.json(sorted);
}
