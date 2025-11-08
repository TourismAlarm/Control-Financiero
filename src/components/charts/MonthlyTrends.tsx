'use client';

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

interface MonthlyTrendsProps {
  transactions: Transaction[];
  months?: number; // Número de meses a mostrar
}

export function MonthlyTrends({ transactions, months = 12 }: MonthlyTrendsProps) {
  // Agrupar por mes
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        ingresos: 0,
        gastos: 0,
        balance: 0,
        ahorroAcumulado: 0
      };
    }

    if (transaction.type === 'income') {
      acc[monthKey].ingresos += transaction.amount;
    } else {
      acc[monthKey].gastos += Math.abs(transaction.amount);
    }

    return acc;
  }, {} as Record<string, { month: string; ingresos: number; gastos: number; balance: number; ahorroAcumulado: number }>);

  // Calcular balance y ahorro acumulado
  let acumulado = 0;
  Object.values(monthlyData).forEach(item => {
    item.balance = item.ingresos - item.gastos;
    acumulado += item.balance;
    item.ahorroAcumulado = acumulado;
  });

  // Convertir a array, ordenar y limitar
  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-months)
    .map(item => ({
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencias Mensuales</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No hay datos suficientes para mostrar tendencias
        </div>
      </div>
    );
  }

  // Calcular promedio mensual
  const avgIncome = chartData.reduce((sum, item) => sum + item.ingresos, 0) / chartData.length;
  const avgExpense = chartData.reduce((sum, item) => sum + item.gastos, 0) / chartData.length;
  const avgBalance = avgIncome - avgExpense;

  // Calcular tendencia (simple regresión lineal del balance)
  const trend = chartData.length > 1
    ? ((chartData[chartData.length - 1]?.balance || 0) - (chartData[0]?.balance || 0)) / chartData.length
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tendencias Mensuales</h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend >= 0 ? '↗' : '↘'} Tendencia: {Math.abs(trend).toFixed(2)}€/mes
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                'ingresos': 'Ingresos',
                'gastos': 'Gastos',
                'balance': 'Balance',
                'ahorroAcumulado': 'Ahorro Acumulado'
              };
              return [`${value.toFixed(2)}€`, labels[name] || name];
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="balance"
            fill="url(#colorBalance)"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Balance"
          />
          <Line
            type="monotone"
            dataKey="ingresos"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Ingresos"
          />
          <Line
            type="monotone"
            dataKey="gastos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Gastos"
          />
          <Line
            type="monotone"
            dataKey="ahorroAcumulado"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            name="Ahorro Acumulado"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Resumen estadístico */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium mb-1">Ingreso promedio</p>
          <p className="text-lg font-bold text-green-700">{avgIncome.toFixed(2)}€</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600 font-medium mb-1">Gasto promedio</p>
          <p className="text-lg font-bold text-red-700">{avgExpense.toFixed(2)}€</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium mb-1">Balance promedio</p>
          <p className={`text-lg font-bold ${avgBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {avgBalance.toFixed(2)}€
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 font-medium mb-1">Ahorro total</p>
          <p className="text-lg font-bold text-purple-700">
            {chartData[chartData.length - 1]?.ahorroAcumulado.toFixed(2) || '0.00'}€
          </p>
        </div>
      </div>
    </div>
  );
}
