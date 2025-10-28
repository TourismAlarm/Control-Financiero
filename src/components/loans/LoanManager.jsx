'use client';

import { useState } from 'react';
import { Plus, TrendingDown, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import useLoans from '@/hooks/useLoans';
import LoanCard from './LoanCard';
import LoanForm from './LoanForm';
import LoanDetailView from './LoanDetailView';
import { formatCurrency, formatDate } from '@/lib/loanCalculations';

/**
 * Componente principal para gestionar todos los préstamos
 */
export default function LoanManager({
  darkMode = false,
  onCreateExpense = null,
  onShowNotification = null
}) {
  const {
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
  } = useLoans();

  const [showForm, setShowForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  const statistics = getStatistics();

  // Handler para marcar pago que también crea un gasto
  const handleMarkPayment = async (loanId) => {
    try {
      // Encontrar el préstamo
      const loan = loans.find(l => l.id === loanId);
      if (!loan) {
        throw new Error('Préstamo no encontrado');
      }

      // Marcar el pago en la base de datos
      await markPaymentAsPaid(loanId);

      // Crear gasto automático si la función está disponible
      if (onCreateExpense) {
        onCreateExpense(
          `Cuota préstamo ${loan.name} #${(loan.paid_months || 0) + 1}`,
          loan.monthly_payment || loan.cuota_mensual,
          'Finanzas'
        );
      }

      // Mostrar notificación si la función está disponible
      if (onShowNotification) {
        onShowNotification('Cuota pagada y registrada en gastos', 'success');
      }
    } catch (err) {
      console.error('Error marking payment:', err);
      if (onShowNotification) {
        onShowNotification('Error al marcar el pago', 'error');
      }
      throw err;
    }
  };

  // Handler para amortización que también crea un gasto
  const handleExtraPayment = async (loanId, amount) => {
    try {
      // Encontrar el préstamo
      const loan = loans.find(l => l.id === loanId);
      if (!loan) {
        throw new Error('Préstamo no encontrado');
      }

      // Realizar amortización en la base de datos
      await makeExtraPayment(loanId, amount);

      // Crear gasto automático si la función está disponible
      if (onCreateExpense) {
        onCreateExpense(
          `Amortización ${loan.name}`,
          amount,
          'Finanzas'
        );
      }

      // Mostrar notificación si la función está disponible
      if (onShowNotification) {
        onShowNotification('Amortización realizada correctamente', 'success');
      }
    } catch (err) {
      console.error('Error making extra payment:', err);
      if (onShowNotification) {
        onShowNotification(err.message || 'Error al realizar amortización', 'error');
      }
      throw err;
    }
  };

  // Manejar agregar préstamo
  const handleAddLoan = async (loanData) => {
    try {
      await addLoan(loanData);
      setShowForm(false);
    } catch (err) {
      console.error('Error adding loan:', err);
      throw err;
    }
  };

  // Manejar ver detalles
  const handleViewDetails = (loan) => {
    setSelectedLoanId(loan.id);
  };

  // Manejar edición desde vista detallada
  const handleEdit = (loan) => {
    setSelectedLoan(loan);
    setShowForm(true);
    setSelectedLoanId(null);
  };

  // Manejar eliminación desde vista detallada
  const handleDelete = async (loanId) => {
    try {
      await deleteLoan(loanId);
      setSelectedLoanId(null);
    } catch (err) {
      console.error('Error deleting loan:', err);
      throw err;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid ${darkMode ? 'border-blue-400 border-t-transparent' : 'border-blue-600 border-t-transparent'}`}></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Cargando préstamos...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border-2 border-red-200'}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={darkMode ? 'text-red-400' : 'text-red-600'} size={24} />
          <div>
            <h3 className={`font-semibold mb-1 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Error al cargar préstamos
            </h3>
            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si hay un préstamo seleccionado, mostrar vista detallada
  if (selectedLoanId) {
    const loan = loans.find(l => l.id === selectedLoanId);
    if (loan) {
      return (
        <>
          <LoanDetailView
            loan={loan}
            amortizationTable={getAmortizationTable(loan)}
            onBack={() => setSelectedLoanId(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMarkPayment={handleMarkPayment}
            onExtraPayment={handleExtraPayment}
            darkMode={darkMode}
          />

          {/* Modal de formulario */}
          {showForm && (
            <LoanForm
              loan={selectedLoan}
              onSubmit={async (data) => {
                await updateLoan(selectedLoan.id, data);
                setShowForm(false);
                setSelectedLoan(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setSelectedLoan(null);
              }}
              darkMode={darkMode}
            />
          )}
        </>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gestión de Préstamos
          </h2>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Controla tus préstamos y amortizaciones
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
            transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105
            ${darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
            }
          `}
        >
          <Plus size={20} />
          Agregar Préstamo
        </button>
      </div>

      {/* Cards de resumen */}
      {loans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de deuda */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="text-white" size={24} />
              <span className="text-white/80 text-sm font-medium">Deuda Total</span>
            </div>
            <p className="text-white text-3xl font-bold">
              {formatCurrency(statistics.totalDebt)}
            </p>
            <p className="text-white/70 text-xs mt-2">
              {statistics.activeLoans} préstamo{statistics.activeLoans !== 1 ? 's' : ''} activo{statistics.activeLoans !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Cuota mensual total */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-orange-600 to-orange-700' : 'bg-gradient-to-br from-orange-400 to-orange-500'}`}>
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="text-white" size={24} />
              <span className="text-white/80 text-sm font-medium">Pago Mensual</span>
            </div>
            <p className="text-white text-3xl font-bold">
              {formatCurrency(statistics.totalMonthlyPayment)}
            </p>
            <p className="text-white/70 text-xs mt-2">
              Total de todas las cuotas
            </p>
          </div>

          {/* Próximo pago */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-white" size={24} />
              <span className="text-white/80 text-sm font-medium">Próximo Pago</span>
            </div>
            {statistics.nextPayment ? (
              <>
                <p className="text-white text-2xl font-bold">
                  {formatCurrency(statistics.nextPayment.amount)}
                </p>
                <p className="text-white/70 text-xs mt-2">
                  {formatDate(statistics.nextPayment.date)}
                </p>
              </>
            ) : (
              <p className="text-white/70 text-sm">No hay pagos pendientes</p>
            )}
          </div>

          {/* Intereses pagados */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="text-white" size={24} />
              <span className="text-white/80 text-sm font-medium">Intereses Pagados</span>
            </div>
            <p className="text-white text-3xl font-bold">
              {formatCurrency(statistics.totalInterestPaid)}
            </p>
            <p className="text-white/70 text-xs mt-2">
              Total acumulado
            </p>
          </div>
        </div>
      )}

      {/* Lista de préstamos o estado vacío */}
      {loans.length === 0 ? (
        <div className={`p-12 rounded-2xl text-center ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border-2 border-gray-200'}`}>
          <div className="max-w-md mx-auto">
            <CreditCard
              className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
              size={64}
            />
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No tienes préstamos registrados
            </h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Comienza agregando tu primer préstamo para llevar un control de tus amortizaciones
            </p>
            <button
              onClick={() => setShowForm(true)}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
                transition-all duration-300 shadow-md hover:shadow-lg
                ${darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }
              `}
            >
              <Plus size={20} />
              Agregar mi primer préstamo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loans.map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onViewDetails={handleViewDetails}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <LoanForm
          loan={selectedLoan}
          onSubmit={handleAddLoan}
          onCancel={() => {
            setShowForm(false);
            setSelectedLoan(null);
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
