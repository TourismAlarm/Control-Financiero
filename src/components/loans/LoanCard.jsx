'use client';

import { formatCurrency, formatDate, daysUntil } from '@/lib/loanCalculations';

/**
 * Tarjeta visual para mostrar un préstamo individual
 */
export default function LoanCard({ loan, onViewDetails, darkMode = false }) {
  const progress = loan.progress || 0;
  const daysUntilPayment = daysUntil(loan.nextPaymentDate);

  // Determinar color del badge según el tipo
  const typeColors = {
    personal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    hipoteca: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    coche: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    tarjeta_credito: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    estudiante: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    otro: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const typeLabels = {
    personal: 'Personal',
    hipoteca: 'Hipoteca',
    coche: 'Coche',
    tarjeta_credito: 'Tarjeta de crédito',
    estudiante: 'Estudiante',
    otro: 'Otro',
  };

  // Determinar urgencia del próximo pago
  const getPaymentUrgency = () => {
    if (daysUntilPayment < 0) return 'text-red-600 dark:text-red-400';
    if (daysUntilPayment <= 7) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      className={`
        p-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
        ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border-2 border-gray-100'}
      `}
    >
      {/* Header con nombre y tipo */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {loan.name}
          </h3>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeColors[loan.type] || typeColors.otro}`}>
            {typeLabels[loan.type] || loan.type}
          </span>
        </div>
        {loan.bank && (
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {loan.bank}
          </div>
        )}
      </div>

      {/* Saldo actual vs Total */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatCurrency(loan.remainingBalance || loan.current_balance)}
          </span>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            de {formatCurrency(loan.initial_amount)}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="relative">
          <div className={`w-full h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs mt-1 block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {progress.toFixed(1)}% pagado • {loan.paid_months} de {loan.total_months} meses
          </span>
        </div>
      </div>

      {/* Información de pago */}
      <div className={`grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
        <div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
            Cuota mensual
          </div>
          <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(loan.monthly_payment)}
          </div>
        </div>
        <div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
            Próximo pago
          </div>
          <div className={`text-sm font-medium ${getPaymentUrgency()}`}>
            {formatDate(loan.nextPaymentDate)}
            {daysUntilPayment >= 0 && (
              <span className="block text-xs">
                {daysUntilPayment === 0 ? '¡Hoy!' : daysUntilPayment === 1 ? 'Mañana' : `En ${daysUntilPayment} días`}
              </span>
            )}
            {daysUntilPayment < 0 && (
              <span className="block text-xs">
                ¡Atrasado!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fecha de finalización */}
      <div className="mb-4">
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
          Finaliza en
        </div>
        <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {formatDate(loan.endDate)} ({loan.total_months - loan.paid_months} meses restantes)
        </div>
      </div>

      {/* Botón Ver detalles */}
      <button
        onClick={() => onViewDetails(loan)}
        className={`
          w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300
          ${darkMode
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
          }
          shadow-md hover:shadow-lg transform hover:scale-[1.02]
        `}
      >
        Ver detalles
      </button>
    </div>
  );
}
