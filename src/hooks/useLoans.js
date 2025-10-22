import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase';
import {
  generateAmortizationTable,
  calculateRemainingBalance,
  calculateEndDate,
  calculateNextPaymentDate,
  calculateProgress,
  calculateTotalInterestPaid,
  calculateMonthlyPayment,
} from '@/lib/loanCalculations';

/**
 * Hook personalizado para gestionar préstamos
 */
export default function useLoans() {
  const { data: session } = useSession();
  const supabase = createClient();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtener todos los préstamos del usuario
   */
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
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Calcular datos adicionales para cada préstamo
      const loansWithCalculations = data.map(loan => {
        const endDate = calculateEndDate(new Date(loan.start_date), loan.total_months);
        const nextPaymentDate = calculateNextPaymentDate(new Date(loan.start_date), loan.paid_months);
        const progress = calculateProgress(loan.paid_months, loan.total_months);
        const remainingBalance = calculateRemainingBalance(
          loan.initial_amount,
          loan.interest_rate,
          loan.total_months,
          loan.paid_months
        );

        return {
          ...loan,
          endDate,
          nextPaymentDate,
          progress,
          remainingBalance,
        };
      });

      setLoans(loansWithCalculations);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  /**
   * Agregar un nuevo préstamo
   */
  const addLoan = async (loanData) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      // Calcular el plazo en meses si no se proporciona
      let totalMonths = loanData.total_months;
      if (!totalMonths && loanData.monthly_payment && loanData.initial_amount) {
        // Estimar el plazo basado en la cuota mensual
        totalMonths = Math.ceil(
          loanData.initial_amount / loanData.monthly_payment
        );
      }

      const newLoan = {
        user_id: session.user.id,
        name: loanData.name,
        type: loanData.type || 'personal',
        initial_amount: parseFloat(loanData.initial_amount),
        current_balance: parseFloat(loanData.current_balance || loanData.initial_amount),
        interest_rate: parseFloat(loanData.interest_rate || 0),
        monthly_payment: parseFloat(loanData.monthly_payment),
        total_months: totalMonths,
        paid_months: parseInt(loanData.paid_months || 0),
        start_date: loanData.start_date,
        payment_day: parseInt(loanData.payment_day || 1),
        bank: loanData.bank || null,
        notes: loanData.notes || null,
        status: 'active',
      };

      const { data, error: insertError } = await supabase
        .from('loans')
        .insert([newLoan])
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar la lista local
      await fetchLoans();

      return data;
    } catch (err) {
      console.error('Error adding loan:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Actualizar un préstamo existente
   */
  const updateLoan = async (loanId, updates) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('loans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar la lista local
      await fetchLoans();

      return data;
    } catch (err) {
      console.error('Error updating loan:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Eliminar un préstamo
   */
  const deleteLoan = async (loanId) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)
        .eq('user_id', session.user.id);

      if (deleteError) throw deleteError;

      // Actualizar la lista local
      setLoans(prevLoans => prevLoans.filter(loan => loan.id !== loanId));
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Obtener la tabla de amortización de un préstamo
   */
  const getAmortizationTable = (loan) => {
    try {
      return generateAmortizationTable(
        loan.initial_amount,
        loan.interest_rate,
        loan.total_months,
        new Date(loan.start_date)
      );
    } catch (err) {
      console.error('Error generating amortization table:', err);
      return [];
    }
  };

  /**
   * Marcar un pago como realizado
   */
  const markPaymentAsPaid = async (loanId) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      const loan = loans.find(l => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const newPaidMonths = loan.paid_months + 1;
      const newBalance = calculateRemainingBalance(
        loan.initial_amount,
        loan.interest_rate,
        loan.total_months,
        newPaidMonths
      );

      // Si ya se pagaron todos los meses, marcar como completado
      const newStatus = newPaidMonths >= loan.total_months ? 'completed' : 'active';

      const { data, error: updateError } = await supabase
        .from('loans')
        .update({
          paid_months: newPaidMonths,
          current_balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar la lista local
      await fetchLoans();

      return data;
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Calcular estadísticas generales de todos los préstamos
   */
  const getStatistics = useCallback(() => {
    const activeLoans = loans.filter(loan => loan.status === 'active');

    const totalDebt = activeLoans.reduce(
      (sum, loan) => sum + (loan.remainingBalance || loan.current_balance),
      0
    );

    const totalMonthlyPayment = activeLoans.reduce(
      (sum, loan) => sum + loan.monthly_payment,
      0
    );

    const totalInterestPaid = activeLoans.reduce((sum, loan) => {
      return sum + calculateTotalInterestPaid(
        loan.initial_amount,
        loan.interest_rate,
        loan.total_months,
        loan.paid_months
      );
    }, 0);

    // Encontrar el próximo pago más cercano
    const upcomingPayments = activeLoans
      .map(loan => ({
        loan,
        date: loan.nextPaymentDate,
        amount: loan.monthly_payment,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: loans.filter(l => l.status === 'completed').length,
      totalDebt,
      totalMonthlyPayment,
      totalInterestPaid,
      nextPayment: upcomingPayments[0] || null,
      upcomingPayments: upcomingPayments.slice(0, 5), // Próximos 5 pagos
    };
  }, [loans]);

  /**
   * Simular pago extra
   */
  const simulateExtraPayment = (loan, extraAmount) => {
    try {
      const currentBalance = loan.remainingBalance || loan.current_balance;
      const newBalance = Math.max(0, currentBalance - extraAmount);

      // Calcular cuántos meses se ahorran
      const monthlyPayment = loan.monthly_payment;
      const remainingMonths = loan.total_months - loan.paid_months;

      // Recalcular el plazo con el nuevo balance
      let newRemainingMonths = 0;
      let balance = newBalance;
      const monthlyRate = loan.interest_rate / 100 / 12;

      while (balance > 0 && newRemainingMonths < remainingMonths) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;
        newRemainingMonths++;
      }

      const monthsSaved = remainingMonths - newRemainingMonths;
      const interestSaved = monthsSaved * monthlyPayment - (currentBalance - newBalance);

      return {
        newBalance,
        monthsSaved,
        interestSaved: Math.max(0, interestSaved),
        newEndDate: calculateEndDate(
          loan.nextPaymentDate,
          newRemainingMonths
        ),
      };
    } catch (err) {
      console.error('Error simulating extra payment:', err);
      return null;
    }
  };

  // Cargar préstamos al montar el componente o cuando cambie la sesión
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
    getStatistics,
    simulateExtraPayment,
    refreshLoans: fetchLoans,
  };
}
