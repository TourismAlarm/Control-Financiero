'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: { name: string; color?: string };
}

interface CategoryDistributionProps {
  transactions: Transaction[];
  type?: 'income' | 'expense';
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function CategoryDistribution({ transactions, type = 'expense' }: CategoryDistributionProps) {
  // Filtrar por tipo y agrupar por categoría
  const categoryData = transactions
    .filter(t => t.type === type)
    .reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Sin categoría';

      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          value: 0,
          count: 0
        };
      }

      acc[categoryName].value += Math.abs(transaction.amount);
      acc[categoryName].count += 1;

      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

  // Convertir a array y ordenar por valor
  const chartData = Object.values(categoryData)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 categorías

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Distribución por Categorías ({type === 'income' ? 'Ingresos' : 'Gastos'})
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No hay datos para mostrar
        </div>
      </div>
    );
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // No mostrar etiquetas muy pequeñas

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Distribución por Categorías ({type === 'income' ? 'Ingresos' : 'Gastos'})
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)}€`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry: any) => {
              const percentage = ((entry.payload.value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Lista de categorías */}
      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {chartData.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                <span className="text-xs text-gray-500">({item.count} transacciones)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{item.value.toFixed(2)}€</span>
                <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
