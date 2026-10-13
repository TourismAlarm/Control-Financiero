/**
 * Apuntar en una deuda los pagos que llegan del banco. Solo servidor.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { splitPayment } from './detect';

export interface LoanState {
  id: string;
  user_id: string;
  bank_match: string | null;
  contact_name: string;
  outstanding_amount: number;
  interest_rate: number;
  status: string;
  created_at: string;
}

/**
 * Registra el movimiento como pago de la deuda. Solo baja lo pendiente si el pago
 * es posterior a crear la deuda: lo anterior ya estaba descontado en la cifra que
 * pusiste al crearla. `loan` se actualiza en memoria para encadenar varios pagos.
 */
export async function linkPaymentToLoan(
  loan: LoanState,
  tx: { id: string; amount: number; date: string },
  opts: { affectsBalance?: boolean } = {}
): Promise<'linked' | 'duplicate' | 'error'> {
  const affectsBalance = opts.affectsBalance ?? tx.date >= loan.created_at.substring(0, 10);
  const { principal, interest } = affectsBalance
    ? splitPayment(tx.amount, loan.outstanding_amount, loan.interest_rate)
    : { principal: tx.amount, interest: 0 };

  const { error } = await supabaseAdmin.from('loan_payments').insert({
    user_id: loan.user_id,
    loan_id: loan.id,
    amount: tx.amount,
    principal_paid: principal,
    interest_paid: interest,
    payment_date: tx.date,
    transaction_id: tx.id,
    notes: affectsBalance ? 'Detectado en el banco' : 'Detectado en el banco (anterior a dar de alta la deuda)',
  });
  if (error) {
    if (error.code === '23505') return 'duplicate';
    console.error('❌ linkPaymentToLoan:', error.message);
    return 'error';
  }

  if (affectsBalance) {
    const outstanding = Math.max(0, Math.round((loan.outstanding_amount - principal) * 100) / 100);
    const status = outstanding === 0 ? 'paid' : loan.status;
    await supabaseAdmin
      .from('loans')
      .update({ outstanding_amount: outstanding, status, updated_at: new Date().toISOString() })
      .eq('id', loan.id)
      .eq('user_id', loan.user_id);
    loan.outstanding_amount = outstanding;
    loan.status = status;
  }
  return 'linked';
}

/** Deudas activas del usuario con lo necesario para enlazar pagos. Vacío si falta la migración 012. */
export async function loadActiveLoans(userId: string): Promise<LoanState[]> {
  const { data, error } = await supabaseAdmin
    .from('loans')
    .select('id, user_id, bank_match, contact_name, outstanding_amount, interest_rate, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) return [];
  return (data || []).map((l: any) => ({
    ...l,
    outstanding_amount: Number(l.outstanding_amount) || 0,
    interest_rate: Number(l.interest_rate) || 0,
  }));
}
