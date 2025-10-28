'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle,
  Circle,
  Bell,
  Filter,
  Search,
} from 'lucide-react';
import { formatCurrency, formatDate, daysUntil } from '@/lib/loanCalculations';

/**
 * Vista detallada de un préstamo individual
 */
export default function LoanDetailView({
  loan,
  amortizationTable,
  onBack,
  onEdit,
  onDelete,
  onMarkPayment,
  onExtraPayment,
  darkMode = false,
}) {
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, pending
  const [searchDate, setSearchDate] = useState('');
  const [showExtraPaymentModal, setShowExtraPaymentModal] = useState(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState('');

  const daysUntilPayment = daysUntil(loan.nextPaymentDate);
  const progress = loan.progress || 0;
  const remainingMonths = loan.total_months - loan.paid_months;
  const remainingYears = Math.floor(remainingMonths / 12);
  const remainingMonthsOnly = remainingMonths % 12;

  // Calcular total de intereses
  const totalInterest = amortizationTable.reduce((sum, row) => sum + row.interest, 0);
  const interestPaid = amortizationTable
    .slice(0, loan.paid_months)
    .reduce((sum, row) => sum + row.interest, 0);

  // Filtrar tabla de amortización
  const filteredTable = amortizationTable.filter((row) => {
    // Filtro por estado
    let matchesStatus = true;
    if (filterStatus === 'paid') {
      matchesStatus = row.month <= loan.paid_months;
    } else if (filterStatus === 'pending') {
      matchesStatus = row.month > loan.paid_months;
    }

    // Filtro por fecha
    let matchesDate = true;
    if (searchDate) {
      const rowDateStr = formatDate(row.date);
      matchesDate = rowDateStr.includes(searchDate);
    }

    return matchesStatus && matchesDate;
  });

  // Determinar estado de cada fila
  const getRowStatus = (month) => {
    if (month <= loan.paid_months) return 'paid';
    if (month === loan.paid_months + 1) return 'next';
    return 'pending';
  };

  const typeLabels = {
    personal: 'Personal',
    hipoteca: 'Hipoteca',
    coche: 'Coche',
    tarjeta_credito: 'Tarjeta de crédito',
    estudiante: 'Estudiante',
    otro: 'Otro',
  };

  const typeColors = {
    personal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    hipoteca: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    coche: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    tarjeta_credito: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    estudiante: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    otro: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1 - HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`
              p-3 rounded-xl transition-all duration-300 hover:scale-110
              ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}
            `}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {loan.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeColors[loan.type] || typeColors.otro}`}>
                {typeLabels[loan.type] || loan.type}
              </span>
              {loan.bank && (
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  • {loan.bank}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExtraPaymentModal(true)}
            disabled={loan.paid_months >= loan.total_months}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300
              ${loan.paid_months >= loan.total_months
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}
          >
            <DollarSign size={18} />
            Amortizar
          </button>
          <button
            onClick={() => onEdit(loan)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300
              ${darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            <Edit size={18} />
            Editar
          </button>
          <button
            onClick={() => {
              if (confirm('¿Estás seguro de eliminar este préstamo?')) {
                onDelete(loan.id);
              }
            }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300
              ${darkMode
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                : 'bg-red-100 hover:bg-red-200 text-red-600'
              }
            `}
          >
            <Trash2 size={18} />
            Eliminar
          </button>
        </div>
      </div>

      {/* SECCIÓN 2 - RESUMEN VISUAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monto inicial */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Monto Inicial
          </div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(loan.initial_amount)}
          </div>
        </div>

        {/* Saldo actual */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
          <div className="text-sm mb-2 text-white/80">Saldo Actual</div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(loan.remainingBalance || loan.current_balance)}
          </div>
        </div>

        {/* Progreso */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Progreso
          </div>
          <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {progress.toFixed(1)}%
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Fecha de finalización */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Finaliza en
          </div>
          <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatDate(loan.endDate)}
          </div>
        </div>

        {/* Tiempo restante */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
          <div className="text-sm mb-2 text-white/80">Tiempo Restante</div>
          <div className="text-xl font-bold text-white">
            {remainingYears > 0 && `${remainingYears} año${remainingYears !== 1 ? 's' : ''}`}
            {remainingYears > 0 && remainingMonthsOnly > 0 && ' y '}
            {remainingMonthsOnly > 0 && `${remainingMonthsOnly} mes${remainingMonthsOnly !== 1 ? 'es' : ''}`}
            {remainingYears === 0 && remainingMonthsOnly === 0 && 'Completado'}
          </div>
        </div>

        {/* Total de intereses */}
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
          <div className="text-sm mb-2 text-white/80">Intereses</div>
          <div className="text-lg font-bold text-white">
            {formatCurrency(interestPaid)}
          </div>
          <div className="text-xs text-white/70 mt-1">
            de {formatCurrency(totalInterest)} total
          </div>
        </div>
      </div>

      {/* SECCIÓN 3 - PRÓXIMO PAGO */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gradient-to-r from-orange-600 to-orange-700' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Calendar className="text-white" size={32} />
            </div>
            <div>
              <div className="text-white/80 text-sm font-medium">Próximo Pago</div>
              <div className="text-white text-3xl font-bold">
                {formatCurrency(loan.monthly_payment)}
              </div>
              <div className="text-white/70 text-sm mt-1">
                {formatDate(loan.nextPaymentDate)}
                {daysUntilPayment >= 0 && (
                  <span className="ml-2">
                    • {daysUntilPayment === 0 ? '¡Hoy!' : daysUntilPayment === 1 ? 'Mañana' : `En ${daysUntilPayment} días`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => onMarkPayment(loan.id)}
            disabled={loan.paid_months >= loan.total_months}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
              ${loan.paid_months >= loan.total_months
                ? 'bg-white/20 text-white/50 cursor-not-allowed'
                : 'bg-white hover:bg-white/90 text-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105'
              }
            `}
          >
            <CheckCircle size={20} />
            {loan.paid_months >= loan.total_months ? 'Completado' : 'Marcar como pagado'}
          </button>
        </div>
      </div>

      {/* SECCIÓN 4 - TABLA DE AMORTIZACIÓN */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className="p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
          <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Tabla de Amortización
          </h3>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${filterStatus === 'all'
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${filterStatus === 'paid'
                    ? darkMode
                      ? 'bg-green-600 text-white'
                      : 'bg-green-500 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                Pagados
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${filterStatus === 'pending'
                    ? darkMode
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-500 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                Pendientes
              </button>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                <input
                  type="text"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  placeholder="Buscar por fecha..."
                  className={`
                    w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-300
                    ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla scrolleable */}
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className={`sticky top-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>#</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fecha</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cuota</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Capital</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Interés</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Saldo</th>
                  <th className={`px-4 py-3 text-center text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredTable.map((row) => {
                  const status = getRowStatus(row.month);
                  return (
                    <tr
                      key={row.month}
                      className={`
                        border-b transition-colors duration-200
                        ${status === 'paid'
                          ? darkMode
                            ? 'bg-green-900/10 border-gray-700'
                            : 'bg-green-50 border-gray-200'
                          : status === 'next'
                            ? darkMode
                              ? 'bg-orange-900/10 border-gray-700'
                              : 'bg-orange-50 border-gray-200'
                            : darkMode
                              ? 'border-gray-700 hover:bg-gray-700/50'
                              : 'border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {row.month}
                      </td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {formatDate(row.date)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(row.payment)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatCurrency(row.principal)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {formatCurrency(row.interest)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle size={16} />
                            Pagado
                          </span>
                        )}
                        {status === 'next' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                            <Bell size={16} />
                            Próximo
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <Circle size={16} />
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Mostrando {filteredTable.length} de {amortizationTable.length} pagos
          </p>
        </div>
      </div>

      {/* Notas si existen */}
      {loan.notes && (
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notas
          </h3>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {loan.notes}
          </p>
        </div>
      )}

      {/* Modal de Amortización */}
      {showExtraPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Amortización Anticipada
            </h3>

            <div className="mb-4">
              <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Saldo actual: <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(loan.remainingBalance || loan.current_balance)}</strong>
              </p>
              <input
                type="number"
                placeholder="Cantidad a amortizar"
                value={extraPaymentAmount}
                onChange={(e) => setExtraPaymentAmount(e.target.value)}
                className={`
                  w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4
                  ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500/20'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-green-500 focus:ring-green-500/20'
                  }
                `}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    if (onExtraPayment) {
                      await onExtraPayment(loan.id, extraPaymentAmount);
                      setExtraPaymentAmount('');
                      setShowExtraPaymentModal(false);
                    }
                  } catch (err) {
                    // El error ya se maneja en el handler
                  }
                }}
                disabled={!extraPaymentAmount || parseFloat(extraPaymentAmount) <= 0}
                className={`
                  flex-1 py-3 rounded-xl font-semibold transition-all duration-300
                  ${!extraPaymentAmount || parseFloat(extraPaymentAmount) <= 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : darkMode
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }
                `}
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowExtraPaymentModal(false);
                  setExtraPaymentAmount('');
                }}
                className={`
                  flex-1 py-3 rounded-xl font-semibold transition-all duration-300
                  ${darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }
                `}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
