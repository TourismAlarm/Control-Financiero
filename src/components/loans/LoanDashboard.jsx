'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, DollarSign, Calendar, Target, Percent } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency } from '@/lib/loanCalculations';

/**
 * Dashboard de evolución de deuda
 * Muestra gráficos y métricas sobre el progreso de los préstamos
 */
export default function LoanDashboard({ loans = [], darkMode = false }) {
  // Generar datos históricos de deuda
  const debtEvolutionData = useMemo(() => {
    if (loans.length === 0) return [];

    // Obtener todas las fechas de pago únicas
    const allDates = new Set();
    loans.forEach(loan => {
      if (loan.fecha_inicio) {
        allDates.add(loan.fecha_inicio);
      }
      if (loan.pagos_realizados && loan.pagos_realizados.length > 0) {
        loan.pagos_realizados.forEach(pago => {
          if (pago.fecha) {
            allDates.add(pago.fecha);
          }
        });
      }
    });

    // Convertir a array y ordenar
    const sortedDates = Array.from(allDates).sort();

    // Calcular deuda total en cada fecha
    const data = sortedDates.map(date => {
      let totalDebt = 0;
      let totalPaid = 0;

      loans.forEach(loan => {
        const loanStart = new Date(loan.fecha_inicio || loan.start_date);
        const currentDate = new Date(date);

        // Si el préstamo ya había comenzado en esta fecha
        if (loanStart <= currentDate) {
          // Calcular cuánto se había pagado hasta esta fecha
          const paidAmount = (loan.pagos_realizados || [])
            .filter(p => new Date(p.fecha) <= currentDate)
            .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

          // Calcular deuda restante
          const initialAmount = loan.monto_total || loan.principal_amount || 0;
          const remaining = Math.max(0, initialAmount - paidAmount);

          totalDebt += remaining;
          totalPaid += paidAmount;
        }
      });

      return {
        fecha: new Date(date).toLocaleDateString('es-ES', {
          year: '2-digit',
          month: 'short',
          day: 'numeric'
        }),
        deudaTotal: totalDebt,
        totalPagado: totalPaid,
      };
    });

    // Agregar punto inicial si hay préstamos
    if (data.length > 0 && loans.length > 0) {
      const initialDebt = loans.reduce((sum, loan) => {
        return sum + (loan.monto_total || loan.principal_amount || 0);
      }, 0);

      // Si el primer punto no tiene la deuda inicial completa, agregarlo
      if (data[0].totalPagado === 0) {
        data[0].deudaTotal = initialDebt;
      }
    }

    return data;
  }, [loans]);

  // Datos de pagos mensuales
  const monthlyPaymentsData = useMemo(() => {
    if (loans.length === 0) return [];

    const paymentsByMonth = {};

    loans.forEach(loan => {
      if (loan.pagos_realizados) {
        loan.pagos_realizados.forEach(pago => {
          const date = new Date(pago.fecha);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('es-ES', {
            year: '2-digit',
            month: 'short'
          });

          if (!paymentsByMonth[monthKey]) {
            paymentsByMonth[monthKey] = {
              mes: monthLabel,
              total: 0,
              cuotas: 0,
              amortizaciones: 0,
            };
          }

          const amount = parseFloat(pago.monto || 0);
          paymentsByMonth[monthKey].total += amount;

          if (pago.tipo === 'amortizacion') {
            paymentsByMonth[monthKey].amortizaciones += amount;
          } else {
            paymentsByMonth[monthKey].cuotas += amount;
          }
        });
      }
    });

    return Object.keys(paymentsByMonth)
      .sort()
      .map(key => paymentsByMonth[key]);
  }, [loans]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalInitialDebt = loans.reduce((sum, loan) => {
      return sum + (loan.monto_total || loan.principal_amount || 0);
    }, 0);

    const totalPaid = loans.reduce((sum, loan) => {
      return sum + (loan.pagos_realizados || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    }, 0);

    const totalRemaining = loans.reduce((sum, loan) => {
      const initial = loan.monto_total || loan.principal_amount || 0;
      const paid = (loan.pagos_realizados || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
      return sum + Math.max(0, initial - paid);
    }, 0);

    const totalInterestPaid = loans.reduce((sum, loan) => {
      return sum + (loan.pagos_realizados || []).reduce((s, p) => {
        return s + (parseFloat(p.interes || 0));
      }, 0);
    }, 0);

    const progressPercentage = totalInitialDebt > 0
      ? ((totalPaid / totalInitialDebt) * 100)
      : 0;

    const avgInterestRate = loans.length > 0
      ? loans.reduce((sum, l) => sum + (l.tasa_interes || l.interest_rate || 0), 0) / loans.length
      : 0;

    return {
      totalInitialDebt,
      totalPaid,
      totalRemaining,
      totalInterestPaid,
      progressPercentage,
      avgInterestRate,
      activeLoans: loans.filter(l => {
        const initial = l.monto_total || l.principal_amount || 0;
        const paid = (l.pagos_realizados || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
        return initial > paid;
      }).length,
    };
  }, [loans]);

  // Custom tooltip para los gráficos
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <p className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loans.length === 0) {
    return (
      <div className={`p-12 rounded-2xl text-center ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border-2 border-gray-200'}`}>
        <TrendingDown
          className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
          size={64}
        />
        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          No hay datos para mostrar
        </h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Agrega préstamos y realiza pagos para ver la evolución de tu deuda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progreso Total */}
        <div className={`p-6 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-green-900/40 to-green-800/40 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Target className={darkMode ? 'text-green-400' : 'text-green-600'} size={24} />
            <span className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              Progreso Total
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-green-900'}`}>
              {stats.progressPercentage.toFixed(1)}%
            </p>
            <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              pagado
            </p>
          </div>
          <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Deuda Restante */}
        <div className={`p-6 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border border-red-700/50' : 'bg-gradient-to-br from-red-50 to-red-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className={darkMode ? 'text-red-400' : 'text-red-600'} size={24} />
            <span className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              Deuda Restante
            </span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-red-900'}`}>
            {formatCurrency(stats.totalRemaining)}
          </p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            {stats.activeLoans} préstamo{stats.activeLoans !== 1 ? 's' : ''} activo{stats.activeLoans !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Pagado */}
        <div className={`p-6 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
            <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Total Pagado
            </span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'}`}>
            {formatCurrency(stats.totalPaid)}
          </p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            de {formatCurrency(stats.totalInitialDebt)} inicial
          </p>
        </div>

        {/* Intereses Pagados */}
        <div className={`p-6 rounded-xl shadow-lg ${darkMode ? 'bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Percent className={darkMode ? 'text-orange-400' : 'text-orange-600'} size={24} />
            <span className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              Intereses Pagados
            </span>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-orange-900'}`}>
            {formatCurrency(stats.totalInterestPaid)}
          </p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            Tasa promedio: {stats.avgInterestRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Gráfico de evolución de deuda */}
      {debtEvolutionData.length > 0 && (
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <TrendingDown size={24} />
            Evolución de la Deuda
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={debtEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="fecha"
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="deudaTotal"
                  name="Deuda Restante"
                  stroke="#ef4444"
                  fill={darkMode ? '#7f1d1d' : '#fee2e2'}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="totalPagado"
                  name="Total Pagado"
                  stroke="#10b981"
                  fill={darkMode ? '#065f46' : '#d1fae5'}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de pagos mensuales */}
      {monthlyPaymentsData.length > 0 && (
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <Calendar size={24} />
            Pagos Mensuales
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPaymentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="mes"
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke={darkMode ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `€${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="cuotas"
                  name="Cuotas Regulares"
                  stackId="a"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="amortizaciones"
                  name="Amortizaciones Anticipadas"
                  stackId="a"
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Progreso individual por préstamo */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Progreso por Préstamo
        </h3>
        <div className="space-y-4">
          {loans.map(loan => {
            const initial = loan.monto_total || loan.principal_amount || 0;
            const paid = (loan.pagos_realizados || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
            const remaining = Math.max(0, initial - paid);
            const progress = initial > 0 ? (paid / initial) * 100 : 0;

            return (
              <div key={loan.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {loan.nombre || loan.name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatCurrency(paid)} de {formatCurrency(initial)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {progress.toFixed(1)}%
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Quedan {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>
                <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      progress >= 75 ? 'bg-green-500' :
                      progress >= 50 ? 'bg-blue-500' :
                      progress >= 25 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
