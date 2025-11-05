'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
}

interface IncomeVsExpensesProps {
  transactions: Transaction[];
}

export function IncomeVsExpenses({ transactions }: IncomeVsExpensesProps) {
  // Agrupar por mes
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        ingresos: 0,
        gastos: 0,
        balance: 0
      };
    }

    if (transaction.type === 'income') {
      acc[monthKey].ingresos += transaction.amount;
    } else {
      acc[monthKey].gastos += Math.abs(transaction.amount);
    }

    acc[monthKey].balance = acc[monthKey].ingresos - acc[monthKey].gastos;

    return acc;
  }, {} as Record<string, { month: string; ingresos: number; gastos: number; balance: number }>);

  // Convertir a array y ordenar por mes
  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6) // Últimos 6 meses
    .map(item => ({
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No hay datos suficientes para mostrar el gráfico
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos (últimos 6 meses)</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
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
            formatter={(value: number) => [`${value.toFixed(2)}€`, '']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend />
          <Bar
            dataKey="ingresos"
            fill="#10b981"
            name="Ingresos"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="gastos"
            fill="#ef4444"
            name="Gastos"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Ingresos totales</p>
          <p className="text-xl font-bold text-green-700">
            {chartData.reduce((sum, item) => sum + item.ingresos, 0).toFixed(2)}€
          </p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Gastos totales</p>
          <p className="text-xl font-bold text-red-700">
            {chartData.reduce((sum, item) => sum + item.gastos, 0).toFixed(2)}€
          </p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Balance</p>
          <p className={`text-xl font-bold ${chartData.reduce((sum, item) => sum + item.balance, 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {chartData.reduce((sum, item) => sum + item.balance, 0).toFixed(2)}€
          </p>
        </div>
      </div>
    </div>
  );
}
