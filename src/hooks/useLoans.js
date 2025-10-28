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
      // Mapear nombres en español a inglés para compatibilidad
      const loansWithCalculations = data.map(loan => {
        // Extraer pagos realizados del JSONB
        const pagosArray = Array.isArray(loan.pagos_realizados) ? loan.pagos_realizados : [];
        const paidMonths = pagosArray.length;

        const endDate = calculateEndDate(new Date(loan.fecha_inicio), loan.plazo_meses);
        const nextPaymentDate = calculateNextPaymentDate(new Date(loan.fecha_inicio), paidMonths);
        const progress = calculateProgress(paidMonths, loan.plazo_meses);

        // Calcular saldo base
        let remainingBalance = calculateRemainingBalance(
          loan.monto_total,
          loan.tasa_interes,
          loan.plazo_meses,
          paidMonths
        );

        // Restar amortizaciones extras
        const amortizacionesExtras = Array.isArray(loan.amortizaciones_extras) ? loan.amortizaciones_extras : [];
        const totalAmortizacionesExtras = amortizacionesExtras.reduce((sum, a) => sum + (a.monto || 0), 0);
        remainingBalance = Math.max(0, remainingBalance - totalAmortizacionesExtras);

        return {
          ...loan,
          // Mapear a nombres en inglés para el resto del código
          id: loan.id,
          name: loan.nombre,
          type: loan.tipo_prestamo,
          initial_amount: loan.monto_total,
          interest_rate: loan.tasa_interes,
          monthly_payment: loan.cuota_mensual,
          total_months: loan.plazo_meses,
          start_date: loan.fecha_inicio,
          notes: loan.descripcion,
          status: loan.estado, // 'activo', 'completado', etc.
          estado: loan.estado, // Mantener también en español
          paid_months: paidMonths,
          current_balance: remainingBalance,
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

      // Mapear a nombres en español que usa Supabase
      const newLoan = {
        user_id: session.user.id,
        nombre: loanData.name,
        tipo_prestamo: loanData.type || 'personal',
        monto_total: parseFloat(loanData.initial_amount),
        tasa_interes: parseFloat(loanData.interest_rate || 0),
        cuota_mensual: parseFloat(loanData.monthly_payment),
        plazo_meses: totalMonths,
        fecha_inicio: loanData.start_date,
        descripcion: loanData.notes || null,
        estado: 'activo',
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
   * Agrega un registro al array JSONB pagos_realizados
   */
  const markPaymentAsPaid = async (loanId) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      const loan = loans.find(l => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      // Obtener el array actual de pagos
      const currentPayments = loan.pagos_realizados || [];

      // Crear nuevo registro de pago
      const newPayment = {
        fecha: new Date().toISOString(),
        monto: loan.monthly_payment,
        numero_pago: currentPayments.length + 1,
      };

      // Agregar el nuevo pago al array
      const updatedPayments = [...currentPayments, newPayment];

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('loans')
        .update({
          pagos_realizados: updatedPayments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Refrescar la lista
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
    // Filtrar por 'activo' (español) que es lo que viene de la BD
    const activeLoans = loans.filter(loan => loan.estado === 'activo' || loan.status === 'activo');

    const totalDebt = activeLoans.reduce(
      (sum, loan) => sum + (loan.remainingBalance || loan.current_balance || 0),
      0
    );

    const totalMonthlyPayment = activeLoans.reduce(
      (sum, loan) => sum + (loan.monthly_payment || loan.cuota_mensual || 0),
      0
    );

    const totalInterestPaid = activeLoans.reduce((sum, loan) => {
      return sum + calculateTotalInterestPaid(
        loan.initial_amount || loan.monto_total,
        loan.interest_rate || loan.tasa_interes,
        loan.total_months || loan.plazo_meses,
        loan.paid_months || 0
      );
    }, 0);

    // Encontrar el próximo pago más cercano
    const upcomingPayments = activeLoans
      .filter(loan => loan.nextPaymentDate && (loan.monthly_payment || loan.cuota_mensual))
      .map(loan => ({
        loan,
        date: loan.nextPaymentDate,
        amount: loan.monthly_payment || loan.cuota_mensual,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: loans.filter(l => l.estado === 'completado' || l.status === 'completed').length,
      totalDebt,
      totalMonthlyPayment,
      totalInterestPaid,
      nextPayment: upcomingPayments[0] || null,
      upcomingPayments: upcomingPayments.slice(0, 5), // Próximos 5 pagos
    };
  }, [loans]);

  /**
   * Realizar amortización anticipada
   */
  const makeExtraPayment = async (loanId, amount) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);

      const loan = loans.find(l => l.id === loanId);
      if (!loan) throw new Error('Préstamo no encontrado');

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Cantidad inválida');
      }

      const currentBalance = loan.remainingBalance || loan.current_balance;
      if (amountNum > currentBalance) {
        throw new Error('La cantidad supera el saldo pendiente');
      }

      // Obtener amortizaciones existentes
      const currentExtraPayments = loan.amortizaciones_extras || [];

      // Crear nueva amortización
      const newExtraPayment = {
        fecha: new Date().toISOString(),
        monto: amountNum,
      };

      // Agregar al array
      const updatedExtraPayments = [...currentExtraPayments, newExtraPayment];

      // Actualizar en Supabase
      const { data, error: updateError } = await supabase
        .from('loans')
        .update({
          amortizaciones_extras: updatedExtraPayments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Refrescar la lista
      await fetchLoans();

      return data;
    } catch (err) {
      console.error('Error making extra payment:', err);
      setError(err.message);
      throw err;
    }
  };

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
    makeExtraPayment,
    getStatistics,
    simulateExtraPayment,
    refreshLoans: fetchLoans,
  };
}
