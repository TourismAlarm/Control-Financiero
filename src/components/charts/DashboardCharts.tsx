'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface Transaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category?: { name: string; color?: string };
}

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

export function DashboardCharts({ transactions }: { transactions: Transaction[] }) {
  // ---- 6-month bar data ----
  const monthlyMap: Record<string, { label: string; ingresos: number; gastos: number }> = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        ingresos: 0,
        gastos: 0,
      };
    }
    if (t.type === 'income') monthlyMap[key].ingresos += t.amount;
    else monthlyMap[key].gastos += Math.abs(t.amount);
  });
  const barData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => v);

  // ---- Pie: expense categories ----
  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const name = t.category?.name || 'Otros';
    catMap[name] = (catMap[name] || 0) + Math.abs(t.amount);
  });
  const pieData = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  if (barData.length === 0 && pieData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Bar chart — últimos 6 meses */}
      {barData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolución últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={v => `${v.toLocaleString()}€`} width={65} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(2)}€`, '']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Ingresos
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Gastos
            </span>
          </div>
        </div>
      )}

      {/* Donut pie — gastos por categoría */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gastos por categoría</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(2)}€`, '']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
