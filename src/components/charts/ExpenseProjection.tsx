'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

interface ExpenseProjectionProps {
  transactions: Transaction[];
  projectionMonths?: number;
}

// Regresión lineal simple
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function ExpenseProjection({ transactions, projectionMonths = 3 }: ExpenseProjectionProps) {
  // Agrupar por mes
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        ingresos: 0,
        gastos: 0
      };
    }

    if (transaction.type === 'income') {
      acc[monthKey].ingresos += transaction.amount;
    } else {
      acc[monthKey].gastos += Math.abs(transaction.amount);
    }

    return acc;
  }, {} as Record<string, { month: string; ingresos: number; gastos: number }>);

  // Convertir a array y ordenar
  const historicalData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Últimos 6 meses para la proyección

  if (historicalData.length < 3) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Proyección de Gastos</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Se necesitan al menos 3 meses de datos para realizar proyecciones
        </div>
      </div>
    );
  }

  // Calcular regresión lineal
  const expenseValues = historicalData.map(d => d.gastos);
  const incomeValues = historicalData.map(d => d.ingresos);

  const expenseRegression = linearRegression(expenseValues);
  const incomeRegression = linearRegression(incomeValues);

  // Generar proyecciones
  const projectedData: any[] = [...historicalData.map((d, i) => ({
    month: d.month,
    monthLabel: new Date(d.month + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
    gastosReales: d.gastos,
    ingresosReales: d.ingresos,
    gastosProyectados: null,
    ingresosProyectados: null,
    isProjection: false
  }))];

  // Añadir meses proyectados
  const lastMonth = new Date(historicalData[historicalData.length - 1].month + '-01');

  for (let i = 1; i <= projectionMonths; i++) {
    const projectionMonth = new Date(lastMonth);
    projectionMonth.setMonth(lastMonth.getMonth() + i);

    const monthKey = `${projectionMonth.getFullYear()}-${String(projectionMonth.getMonth() + 1).padStart(2, '0')}`;

    const index = historicalData.length + i - 1;
    const projectedExpense = expenseRegression.slope * index + expenseRegression.intercept;
    const projectedIncome = incomeRegression.slope * index + incomeRegression.intercept;

    projectedData.push({
      month: monthKey,
      monthLabel: projectionMonth.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      gastosReales: null,
      ingresosReales: null,
      gastosProyectados: Math.max(0, projectedExpense),
      ingresosProyectados: Math.max(0, projectedIncome),
      isProjection: true
    });
  }

  // Calcular tendencia
  const avgExpense = expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length;
  const lastExpense = expenseValues[expenseValues.length - 1];
  const expenseTrend = ((lastExpense - avgExpense) / avgExpense) * 100;

  const avgIncome = incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
  const lastIncome = incomeValues[incomeValues.length - 1];
  const incomeTrend = ((lastIncome - avgIncome) / avgIncome) * 100;

  // Proyección del último mes
  const lastProjectedExpense = projectedData[projectedData.length - 1]?.gastosProyectados || 0;
  const lastProjectedIncome = projectedData[projectedData.length - 1]?.ingresosProyectados || 0;
  const projectedBalance = lastProjectedIncome - lastProjectedExpense;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Proyección de Gastos e Ingresos</h3>
        <span className="text-xs text-gray-500">Basado en los últimos {historicalData.length} meses</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={projectedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="monthLabel"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toLocaleString()}€`}
          />
          <Tooltip
            formatter={(value: number | null) => value !== null ? `${value.toFixed(2)}€` : 'N/A'}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend />
          <ReferenceLine x={projectedData[historicalData.length - 1]?.monthLabel} stroke="#9ca3af" strokeDasharray="3 3" />

          <Line
            type="monotone"
            dataKey="gastosReales"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 5 }}
            name="Gastos Reales"
          />
          <Line
            type="monotone"
            dataKey="gastosProyectados"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#ef4444' }}
            name="Gastos Proyectados"
          />
          <Line
            type="monotone"
            dataKey="ingresosReales"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 5 }}
            name="Ingresos Reales"
          />
          <Line
            type="monotone"
            dataKey="ingresosProyectados"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#10b981' }}
            name="Ingresos Proyectados"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Indicadores de tendencia */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            {expenseTrend > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            <span className="text-sm font-medium text-red-700">Tendencia de Gastos</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{Math.abs(expenseTrend).toFixed(1)}%</p>
          <p className="text-xs text-red-600 mt-1">{expenseTrend > 0 ? 'Incremento' : 'Reducción'} vs promedio</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            {incomeTrend > 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-green-600" />}
            <span className="text-sm font-medium text-green-700">Tendencia de Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{Math.abs(incomeTrend).toFixed(1)}%</p>
          <p className="text-xs text-green-600 mt-1">{incomeTrend > 0 ? 'Incremento' : 'Reducción'} vs promedio</p>
        </div>

        <div className={`p-4 rounded-lg border ${projectedBalance < 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {projectedBalance < 0 && <AlertTriangle className="w-5 h-5 text-orange-600" />}
            <span className={`text-sm font-medium ${projectedBalance < 0 ? 'text-orange-700' : 'text-blue-700'}`}>
              Balance Proyectado
            </span>
          </div>
          <p className={`text-2xl font-bold ${projectedBalance < 0 ? 'text-orange-800' : 'text-blue-800'}`}>
            {projectedBalance.toFixed(2)}€
          </p>
          <p className={`text-xs mt-1 ${projectedBalance < 0 ? 'text-orange-600' : 'text-blue-600'}`}>
            Próximo mes estimado
          </p>
        </div>
      </div>
    </div>
  );
}
