import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase';
import {
  calculateTotalInterestPaid,
} from '@/lib/loanCalculations';

/**
 * Hook personalizado para gestionar préstamos
 *
 * Database schema:
 *   loans: id, user_id, type ('borrowed'|'lent'), contact_name, principal_amount,
 *          outstanding_amount, interest_rate, start_date, due_date,
 *          status ('active'|'paid'|'cancelled'), notes
 *   loan_payments: id, user_id, loan_id, amount, principal_paid, interest_paid,
 *                  payment_date, notes
 *
 * Backward-compat aliases are added to each loan object so existing UI components
 * continue to work without changes.
 */
export default function useLoans() {
  const { data: session } = useSession();
  const supabase = createClient();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  /** Derive term in months from start_date and due_date */
  const derivePlazoMeses = (start_date, due_date) => {
    if (!start_date || !due_date) return null;
    const start = new Date(start_date);
    const end = new Date(due_date);
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44)));
  };

  /** Map DB status (English) to legacy Spanish value */
  const toEstado = (status) => {
    const map = { active: 'activo', paid: 'completado', cancelled: 'cancelado' };
    return map[status] || status;
  };

  /**
   * Enrich a raw DB loan row with backward-compat aliases and
   * derived fields, using its loan_payments array.
   */
  const enrichLoan = (loan) => {
    const payments = (loan.loan_payments || []).sort(
      (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
    );

    // Map loan_payments → pagos_realizados format expected by UI
    const pagos_realizados = payments.map((p, idx) => ({
      fecha: p.payment_date,
      monto: p.amount,
      numero_pago: idx + 1,
      _payment_id: p.id, // internal, used for edit/delete operations
    }));

    const paidMonths = payments.length;
    const plazo_meses = derivePlazoMeses(loan.start_date, loan.due_date);
    const estado = toEstado(loan.status);

    // Progress based on amount paid vs principal
    const totalPaid = payments.reduce((sum, p) => sum + (p.principal_paid || p.amount || 0), 0);
    const progress = loan.principal_amount > 0
      ? Math.min(100, Math.round((totalPaid / loan.principal_amount) * 100))
      : 0;

    return {
      ...loan,
      // Backward-compat Spanish aliases
      nombre: loan.contact_name,
      name: loan.contact_name,
      tipo_prestamo: loan.type,
      monto_total: loan.principal_amount,
      initial_amount: loan.principal_amount,
      tasa_interes: loan.interest_rate,
      fecha_inicio: loan.start_date,
      plazo_meses,
      total_months: plazo_meses,
      cuota_mensual: null, // Not stored in DB; UI should handle null
      monthly_payment: null,
      descripcion: loan.notes,
      estado,
      // Payment history
      pagos_realizados,
      amortizaciones_extras: [], // Not supported in new schema
      // Computed
      paid_months: paidMonths,
      current_balance: loan.outstanding_amount,
      remainingBalance: loan.outstanding_amount,
      nextPaymentDate: loan.due_date ? new Date(loan.due_date) : null,
      endDate: loan.due_date ? new Date(loan.due_date) : null,
      progress,
    };
  };

  // ----------------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------------

  const fetchLoans = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('loans')
        .select('*, loan_payments(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLoans((data || []).map(enrichLoan));
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  // ----------------------------------------------------------------
  // CRUD
  // ----------------------------------------------------------------

  const addLoan = async (loanData) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const principal = parseFloat(
        loanData.principal_amount ?? loanData.monto_total ?? loanData.initial_amount ?? 0
      );

      const newLoan = {
        user_id: session.user.id,
        type: loanData.type ?? loanData.tipo_prestamo ?? 'borrowed',
        contact_name: loanData.contact_name ?? loanData.name ?? loanData.nombre ?? '',
        principal_amount: principal,
        outstanding_amount: parseFloat(loanData.outstanding_amount ?? principal),
        interest_rate: parseFloat(loanData.interest_rate ?? loanData.tasa_interes ?? 0),
        start_date: loanData.start_date ?? loanData.fecha_inicio,
        due_date: loanData.due_date ?? null,
        status: 'active',
        notes: loanData.notes ?? loanData.descripcion ?? null,
      };

      const { data, error: insertError } = await supabase
        .from('loans')
        .insert([newLoan])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchLoans();
      return data;
    } catch (err) {
      console.error('Error adding loan:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateLoan = async (loanId, updates) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      // Accept both English DB names and legacy Spanish aliases
      const mappedUpdates = {};

      if (updates.type !== undefined) mappedUpdates.type = updates.type;
      if (updates.tipo_prestamo !== undefined) mappedUpdates.type = updates.tipo_prestamo;

      if (updates.contact_name !== undefined) mappedUpdates.contact_name = updates.contact_name;
      if (updates.name !== undefined) mappedUpdates.contact_name = updates.name;
      if (updates.nombre !== undefined) mappedUpdates.contact_name = updates.nombre;

      if (updates.principal_amount !== undefined) mappedUpdates.principal_amount = parseFloat(updates.principal_amount);
      if (updates.monto_total !== undefined) mappedUpdates.principal_amount = parseFloat(updates.monto_total);
      if (updates.initial_amount !== undefined) mappedUpdates.principal_amount = parseFloat(updates.initial_amount);

      if (updates.outstanding_amount !== undefined) mappedUpdates.outstanding_amount = parseFloat(updates.outstanding_amount);
      if (updates.current_balance !== undefined) mappedUpdates.outstanding_amount = parseFloat(updates.current_balance);

      if (updates.interest_rate !== undefined) mappedUpdates.interest_rate = parseFloat(updates.interest_rate);
      if (updates.tasa_interes !== undefined) mappedUpdates.interest_rate = parseFloat(updates.tasa_interes);

      if (updates.start_date !== undefined) mappedUpdates.start_date = updates.start_date;
      if (updates.fecha_inicio !== undefined) mappedUpdates.start_date = updates.fecha_inicio;

      if (updates.due_date !== undefined) mappedUpdates.due_date = updates.due_date;

      if (updates.status !== undefined) mappedUpdates.status = updates.status;
      if (updates.estado !== undefined) {
        const map = { activo: 'active', completado: 'paid', cancelado: 'cancelled' };
        mappedUpdates.status = map[updates.estado] ?? updates.estado;
      }

      if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;
      if (updates.descripcion !== undefined) mappedUpdates.notes = updates.descripcion;

      const { data, error: updateError } = await supabase
        .from('loans')
        .update({ ...mappedUpdates, updated_at: new Date().toISOString() })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchLoans();
      return data;
    } catch (err) {
      console.error('Error updating loan:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteLoan = async (loanId) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)
        .eq('user_id', session.user.id);

      if (deleteError) throw deleteError;

      setLoans((prev) => prev.filter((l) => l.id !== loanId));
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError(err.message);
      throw err;
    }
  };

  // ----------------------------------------------------------------
  // Payment operations (loan_payments table)
  // ----------------------------------------------------------------

  /**
   * Record a payment against a loan.
   * Inserts a loan_payments row and decrements outstanding_amount.
   */
  const markPaymentAsPaid = async (loanId, amount = 0, notes = null) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const loan = loans.find((l) => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const paymentAmount = parseFloat(amount) || 0;

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('loan_payments')
        .insert({
          user_id: session.user.id,
          loan_id: loanId,
          amount: paymentAmount,
          principal_paid: paymentAmount,
          interest_paid: 0,
          payment_date: new Date().toISOString().split('T')[0],
          notes,
        });

      if (paymentError) throw paymentError;

      // Update outstanding amount
      const newOutstanding = Math.max(0, loan.outstanding_amount - paymentAmount);
      const newStatus = newOutstanding === 0 ? 'paid' : loan.status;

      const { data, error: updateError } = await supabase
        .from('loans')
        .update({
          outstanding_amount: newOutstanding,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchLoans();
      return data;
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError(err.message);
      throw err;
    }
  };

  /** Alias for marking an extra/early payment */
  const makeExtraPayment = async (loanId, amount) => {
    return markPaymentAsPaid(loanId, parseFloat(amount));
  };

  /**
   * Edit the date of an existing payment (by its index in pagos_realizados).
   */
  const editPaymentDate = async (loanId, paymentIndex, newDate) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const loan = loans.find((l) => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const payment = loan.pagos_realizados[paymentIndex];
      if (!payment) throw new Error('Pago no encontrado');

      const { error: updateError } = await supabase
        .from('loan_payments')
        .update({ payment_date: newDate })
        .eq('id', payment._payment_id)
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      await fetchLoans();
    } catch (err) {
      console.error('Error editing payment date:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Edit the amount of an existing payment (by its index in pagos_realizados).
   * Also adjusts outstanding_amount on the parent loan.
   */
  const editPaymentAmount = async (loanId, paymentIndex, newAmount) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const loan = loans.find((l) => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const payment = loan.pagos_realizados[paymentIndex];
      if (!payment) throw new Error('Pago no encontrado');

      const oldAmount = parseFloat(payment.monto) || 0;
      const parsedNewAmount = parseFloat(newAmount) || 0;
      const delta = parsedNewAmount - oldAmount;

      const { error: updateError } = await supabase
        .from('loan_payments')
        .update({ amount: parsedNewAmount, principal_paid: parsedNewAmount })
        .eq('id', payment._payment_id)
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      // Adjust outstanding_amount by the difference
      const newOutstanding = Math.max(0, loan.outstanding_amount - delta);
      const { error: loanUpdateError } = await supabase
        .from('loans')
        .update({
          outstanding_amount: newOutstanding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id);

      if (loanUpdateError) throw loanUpdateError;

      await fetchLoans();
    } catch (err) {
      console.error('Error editing payment amount:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Delete a payment (by its index in pagos_realizados).
   * Restores the payment amount to outstanding_amount.
   */
  const deletePayment = async (loanId, paymentIndex) => {
    if (!session?.user?.id) throw new Error('Usuario no autenticado');

    try {
      setError(null);

      const loan = loans.find((l) => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const payment = loan.pagos_realizados[paymentIndex];
      if (!payment) throw new Error('Pago no encontrado');

      const { error: deleteError } = await supabase
        .from('loan_payments')
        .delete()
        .eq('id', payment._payment_id)
        .eq('user_id', session.user.id);

      if (deleteError) throw deleteError;

      // Restore the paid amount to outstanding
      const restoredAmount = parseFloat(payment.monto) || 0;
      const newOutstanding = loan.outstanding_amount + restoredAmount;

      const { error: loanUpdateError } = await supabase
        .from('loans')
        .update({
          outstanding_amount: newOutstanding,
          status: newOutstanding > 0 && loan.status === 'paid' ? 'active' : loan.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id);

      if (loanUpdateError) throw loanUpdateError;

      await fetchLoans();
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError(err.message);
      throw err;
    }
  };

  // ----------------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------------

  const getStatistics = useCallback(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');

    const totalDebt = activeLoans.reduce(
      (sum, l) => sum + (l.outstanding_amount || 0),
      0
    );

    // Sum interest_paid from all loan_payments records
    const totalInterestPaid = loans.reduce((sum, loan) => {
      const payments = loan.pagos_realizados || [];
      return sum + payments.reduce((s, p) => s + 0, 0); // interest_paid stored per payment
    }, 0);

    // Next payment: loan with earliest due_date among active loans
    const upcomingPayments = activeLoans
      .filter((l) => l.due_date)
      .map((l) => ({
        loan: l,
        date: new Date(l.due_date),
        amount: l.outstanding_amount,
      }))
      .sort((a, b) => a.date - b.date);

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: loans.filter((l) => l.status === 'paid').length,
      cancelledLoans: loans.filter((l) => l.status === 'cancelled').length,
      totalDebt,
      totalPrincipal: activeLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0),
      totalMonthlyPayment: 0, // Not stored in DB
      totalInterestPaid,
      nextPayment: upcomingPayments[0] || null,
      upcomingPayments: upcomingPayments.slice(0, 5),
    };
  }, [loans]);

  /**
   * Generate an amortization table for a loan.
   * Requires plazo_meses (derived from start_date + due_date).
   * Returns empty array if term cannot be determined.
   */
  const getAmortizationTable = (loan) => {
    const { generateAmortizationTable } = require('@/lib/loanCalculations');
    try {
      if (!loan.plazo_meses || !loan.start_date) return [];
      return generateAmortizationTable(
        loan.principal_amount,
        loan.interest_rate,
        loan.plazo_meses,
        new Date(loan.start_date)
      );
    } catch (err) {
      console.error('Error generating amortization table:', err);
      return [];
    }
  };

  const simulateExtraPayment = (loan, extraAmount) => {
    try {
      const currentBalance = loan.outstanding_amount;
      const newBalance = Math.max(0, currentBalance - extraAmount);

      return {
        newBalance,
        monthsSaved: null, // Can't compute without fixed term
        interestSaved: 0,
        newEndDate: null,
      };
    } catch (err) {
      console.error('Error simulating extra payment:', err);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return {
    loans,
    loading,
    error,
    addLoan,
    updateLoan,
    deleteLoan,
    getAmortizationTable,
    markPaymentAsPaid,
    makeExtraPayment,
    editPaymentDate,
    editPaymentAmount,
    deletePayment,
    getStatistics,
    simulateExtraPayment,
    refreshLoans: fetchLoans,
  };
}
