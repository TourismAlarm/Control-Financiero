'use client';

import { useState } from 'react';
import { Plus, TrendingDown, CreditCard, Calendar, AlertCircle, Calculator, BarChart3, List } from 'lucide-react';
import useLoans from '@/hooks/useLoans';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import LoanCard from './LoanCard';
import LoanForm from './LoanForm';
import LoanDetailView from './LoanDetailView';
import LoanCalculator from './LoanCalculator';
import LoanDashboard from './LoanDashboard';
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
    editPaymentDate,
    editPaymentAmount,
    deletePayment,
    getStatistics,
  } = useLoans();

  const { createTransactionAsync, transactions, deleteTransaction } = useTransactions();
  const { accounts, createAccount } = useAccounts();
  const { categories, createCategory } = useCategories();

  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'dashboard'

  const statistics = getStatistics();

  // Helper para asegurar que existan cuenta y categoría de deudas
  const ensureAccountAndCategory = async () => {
    let account = accounts.find(a => a.is_active) || accounts[0];
    let debtCategory = categories.find(c =>
      c.type === 'expense' &&
      (c.name.toLowerCase().includes('deuda') ||
       c.name.toLowerCase().includes('préstamo') ||
       c.name.toLowerCase().includes('prestamo'))
    );

    // Si no hay cuenta, crear una por defecto
    if (!account && accounts.length === 0) {
      try {
        account = await createAccount({
          name: 'Cuenta Principal',
          type: 'bank',
          balance: 0,
          currency: 'EUR',
          is_active: true,
        });
      } catch (err) {
        console.error('Error creating default account:', err);
      }
    }

    // Si no hay categoría de deudas, crear una
    if (!debtCategory) {
      try {
        debtCategory = await createCategory({
          name: 'Deudas y Préstamos',
          type: 'expense',
          icon: '💳',
          color: '#ef4444',
        });
      } catch (err) {
        console.error('Error creating debt category:', err);
      }
    }

    return { account, debtCategory };
  };

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

      // Asegurar que existan cuenta y categoría
      const { account, debtCategory } = await ensureAccountAndCategory();

      if (account && debtCategory) {
        await createTransactionAsync({
          type: 'expense',
          amount: loan.monthly_payment || loan.cuota_mensual,
          description: `Cuota préstamo ${loan.name} #${(loan.paid_months || 0) + 1}`,
          date: new Date().toISOString().split('T')[0],
          account_id: account.id,
          category_id: debtCategory.id,
        });

        alert('✅ Cuota marcada como pagada y registrada en transacciones');
      } else {
        alert('⚠️ Cuota marcada como pagada, pero no se pudo crear transacción automática');
      }
    } catch (err) {
      console.error('Error marking payment:', err);
      alert('❌ Error al marcar el pago: ' + err.message);
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

      // Asegurar que existan cuenta y categoría
      const { account, debtCategory } = await ensureAccountAndCategory();

      if (account && debtCategory) {
        await createTransactionAsync({
          type: 'expense',
          amount: amount,
          description: `Amortización anticipada ${loan.name}`,
          date: new Date().toISOString().split('T')[0],
          account_id: account.id,
          category_id: debtCategory.id,
        });

        alert('✅ Amortización realizada y registrada en transacciones');
      } else {
        alert('⚠️ Amortización realizada, pero no se pudo crear transacción automática');
      }
    } catch (err) {
      console.error('Error making extra payment:', err);
      alert('❌ Error al realizar amortización: ' + err.message);
      throw err;
    }
  };

  // Handler para eliminar pago que también elimina la transacción sincronizada
  const handleDeletePayment = async (loanId, paymentIndex) => {
    try {
      // Encontrar el préstamo y el pago
      const loan = loans.find(l => l.id === loanId);
      if (!loan || !loan.pagos_realizados || !loan.pagos_realizados[paymentIndex]) {
        throw new Error('Préstamo o pago no encontrado');
      }

      const payment = loan.pagos_realizados[paymentIndex];

      // Eliminar el pago del préstamo primero
      await deletePayment(loanId, paymentIndex);

      // Buscar transacción correspondiente
      // Formato esperado: "Cuota préstamo [Nombre] #[Número]"
      const paymentNumber = payment.numero_pago || paymentIndex + 1;
      const expectedDescription = `Cuota préstamo ${loan.nombre || loan.name} #${paymentNumber}`;

      // Buscar transacción por descripción similar, monto y fecha cercana
      const matchingTransaction = transactions.find(t => {
        if (t.type !== 'expense') return false;

        // Comparar descripción (ignorar mayúsculas/minúsculas y acentos)
        const descMatch = t.description?.toLowerCase().includes(loan.nombre?.toLowerCase() || loan.name?.toLowerCase());

        // Comparar monto (con tolerancia de 0.01)
        const amountMatch = Math.abs(parseFloat(t.amount) - parseFloat(payment.monto)) < 0.01;

        // Comparar fecha (con tolerancia de 3 días)
        if (!t.date || !payment.fecha) return descMatch && amountMatch;

        const tDate = new Date(t.date);
        const pDate = new Date(payment.fecha);
        const daysDiff = Math.abs((tDate - pDate) / (1000 * 60 * 60 * 24));
        const dateMatch = daysDiff <= 3;

        return descMatch && amountMatch && dateMatch;
      });

      // Si se encontró transacción, eliminarla también
      if (matchingTransaction) {
        try {
          await deleteTransaction(matchingTransaction.id);
          console.log('✅ Transacción sincronizada eliminada:', matchingTransaction.description);
        } catch (transError) {
          console.warn('⚠️ No se pudo eliminar la transacción sincronizada:', transError);
          // No lanzar error, el pago ya se eliminó
        }
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
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

  // Manejar creación desde calculadora
  const handleCreateFromCalculator = (calculatedData) => {
    // Pre-cargar el formulario con los valores calculados
    setSelectedLoan({
      monto_total: calculatedData.monto_total,
      tasa_interes: calculatedData.tasa_interes,
      plazo_meses: calculatedData.plazo_meses,
      cuota_mensual: calculatedData.cuota_mensual,
    });
    setShowCalculator(false);
    setShowForm(true);
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
            onEditPaymentDate={editPaymentDate}
            onEditPaymentAmount={editPaymentAmount}
            onDeletePayment={handleDeletePayment}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gestión de Préstamos
          </h2>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Controla tus préstamos y amortizaciones
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* View Toggle */}
          {loans.length > 0 && (
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all
                  ${viewMode === 'list'
                    ? darkMode
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-white text-gray-900 shadow-md'
                    : darkMode
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <List size={18} />
                Lista
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all
                  ${viewMode === 'dashboard'
                    ? darkMode
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-white text-gray-900 shadow-md'
                    : darkMode
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <BarChart3 size={18} />
                Dashboard
              </button>
            </div>
          )}

          <button
            onClick={() => setShowCalculator(true)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
              transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105
              ${darkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
              }
            `}
          >
            <Calculator size={20} />
            Calculadora
          </button>

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
      </div>

      {/* Contenido principal basado en vista */}
      {viewMode === 'dashboard' && loans.length > 0 ? (
        <LoanDashboard loans={loans} darkMode={darkMode} />
      ) : (
        <>
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
        </>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <LoanForm
          loan={selectedLoan}
          onSubmit={async (data) => {
            if (selectedLoan) {
              // Modo edición
              await updateLoan(selectedLoan.id, data);
            } else {
              // Modo creación
              await handleAddLoan(data);
            }
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

      {/* Modal de calculadora */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              {/* Header */}
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Calculadora de Préstamos
                  </h3>
                  <button
                    onClick={() => setShowCalculator(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Calculator Component */}
              <div className="p-6">
                <LoanCalculator
                  darkMode={darkMode}
                  onCreateLoan={handleCreateFromCalculator}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
