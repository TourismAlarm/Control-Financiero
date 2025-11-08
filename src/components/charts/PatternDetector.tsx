'use client';

import { AlertTriangle, TrendingUp, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: { name: string };
}

interface PatternDetectorProps {
  transactions: Transaction[];
}

interface Pattern {
  type: 'warning' | 'info' | 'success';
  icon: any;
  title: string;
  description: string;
  metric?: string;
}

export function PatternDetector({ transactions }: PatternDetectorProps) {
  const patterns: Pattern[] = [];

  if (transactions.length < 10) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detección de Patrones</h3>
        <div className="text-center text-gray-500 py-8">
          Se necesitan al menos 10 transacciones para detectar patrones
        </div>
      </div>
    );
  }

  // 1. Detectar gastos inusualmente altos
  const expenses = transactions.filter(t => t.type === 'expense');
  const expenseAmounts = expenses.map(t => Math.abs(t.amount));
  const avgExpense = expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length;
  const stdDev = Math.sqrt(
    expenseAmounts.reduce((sum, amount) => sum + Math.pow(amount - avgExpense, 2), 0) / expenseAmounts.length
  );

  const unusualExpenses = expenses.filter(t => Math.abs(t.amount) > avgExpense + 2 * stdDev);
  if (unusualExpenses.length > 0 && unusualExpenses[0]) {
    const firstExpense = unusualExpenses[0];
    patterns.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Gastos Inusuales Detectados',
      description: `Se han detectado ${unusualExpenses.length} transacción(es) significativamente superiores al promedio.`,
      metric: `${Math.abs(firstExpense.amount).toFixed(2)}€ (${(firstExpense.description || 'Sin descripción').substring(0, 30)}...)`
    });
  }

  // 2. Detectar categorías con crecimiento rápido
  const last30Days = transactions.filter(t => {
    const transDate = new Date(t.date);
    const today = new Date();
    const diffDays = (today.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && t.type === 'expense';
  });

  const previous30Days = transactions.filter(t => {
    const transDate = new Date(t.date);
    const today = new Date();
    const diffDays = (today.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 30 && diffDays <= 60 && t.type === 'expense';
  });

  const categoryCompare: Record<string, { current: number; previous: number }> = {};

  last30Days.forEach(t => {
    const cat = t.category?.name || 'Sin categoría';
    if (!categoryCompare[cat]) categoryCompare[cat] = { current: 0, previous: 0 };
    categoryCompare[cat].current += Math.abs(t.amount);
  });

  previous30Days.forEach(t => {
    const cat = t.category?.name || 'Sin categoría';
    if (!categoryCompare[cat]) categoryCompare[cat] = { current: 0, previous: 0 };
    categoryCompare[cat].previous += Math.abs(t.amount);
  });

  Object.entries(categoryCompare).forEach(([category, data]) => {
    if (data.previous > 0) {
      const growth = ((data.current - data.previous) / data.previous) * 100;
      if (growth > 50) {
        patterns.push({
          type: 'warning',
          icon: TrendingUp,
          title: `Incremento en ${category}`,
          description: `Los gastos en esta categoría han aumentado un ${growth.toFixed(0)}% en los últimos 30 días.`,
          metric: `${data.current.toFixed(2)}€ (vs ${data.previous.toFixed(2)}€)`
        });
      }
    }
  });

  // 3. Detectar transacciones recurrentes
  const descriptionGroups: Record<string, Transaction[]> = {};

  transactions.forEach(t => {
    // Normalizar descripción (quitar números, fechas, etc.)
    const normalized = t.description
      .toLowerCase()
      .replace(/\d+/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();

    if (normalized.length > 5) {
      if (!descriptionGroups[normalized]) {
        descriptionGroups[normalized] = [];
      }
      descriptionGroups[normalized].push(t);
    }
  });

  const recurringPatterns = Object.entries(descriptionGroups)
    .filter(([_, trans]) => trans.length >= 3)
    .map(([_, trans]) => ({
      description: trans[0]?.description || 'Sin descripción',
      count: trans.length,
      avgAmount: trans.reduce((sum, t) => sum + Math.abs(t.amount), 0) / trans.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (recurringPatterns.length > 0 && recurringPatterns[0]) {
    const firstPattern = recurringPatterns[0];
    patterns.push({
      type: 'info',
      icon: Calendar,
      title: 'Transacciones Recurrentes',
      description: `Se han identificado ${recurringPatterns.length} transacción(es) que se repiten regularmente.`,
      metric: `${firstPattern.description.substring(0, 30)} (${firstPattern.count}x)`
    });
  }

  // 4. Evaluar salud financiera
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  if (savingsRate > 20) {
    patterns.push({
      type: 'success',
      icon: CheckCircle2,
      title: 'Excelente Tasa de Ahorro',
      description: `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos. ¡Sigue así!`,
      metric: `${(totalIncome - totalExpense).toFixed(2)}€ ahorrados`
    });
  } else if (savingsRate < 0) {
    patterns.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Gastos Superiores a Ingresos',
      description: 'Tus gastos están superando tus ingresos. Considera revisar tu presupuesto.',
      metric: `Déficit: ${Math.abs(totalIncome - totalExpense).toFixed(2)}€`
    });
  }

  // 5. Día de la semana con más gastos
  const dayExpenses: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };

  expenses.forEach(t => {
    const day = new Date(t.date).getDay();
    const dayKey = day.toString();
    dayExpenses[dayKey] = (dayExpenses[dayKey] || 0) + Math.abs(t.amount);
  });

  const sortedDays = Object.entries(dayExpenses)
    .sort((a, b) => b[1] - a[1]);
  const maxDayIndex = sortedDays[0]?.[0] || '0';

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  patterns.push({
    type: 'info',
    icon: Sparkles,
    title: 'Patrón Semanal',
    description: `Los ${dayNames[parseInt(maxDayIndex)]}s son los días con más gastos en promedio.`,
    metric: `${(dayExpenses[maxDayIndex] || 0).toFixed(2)}€ total`
  });

  if (patterns.length === 0) {
    patterns.push({
      type: 'success',
      icon: CheckCircle2,
      title: 'Sin Anomalías',
      description: 'No se han detectado patrones preocupantes en tus finanzas.',
      metric: undefined
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detección de Patrones</h3>

      <div className="space-y-3">
        {patterns.map((pattern, index) => {
          const Icon = pattern.icon;
          const colors = {
            warning: {
              bg: 'bg-orange-50',
              border: 'border-orange-200',
              icon: 'text-orange-600',
              title: 'text-orange-900',
              desc: 'text-orange-700'
            },
            info: {
              bg: 'bg-blue-50',
              border: 'border-blue-200',
              icon: 'text-blue-600',
              title: 'text-blue-900',
              desc: 'text-blue-700'
            },
            success: {
              bg: 'bg-green-50',
              border: 'border-green-200',
              icon: 'text-green-600',
              title: 'text-green-900',
              desc: 'text-green-700'
            }
          };

          const color = colors[pattern.type];

          return (
            <div
              key={index}
              className={`${color.bg} ${color.border} border rounded-lg p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${color.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h4 className={`font-semibold ${color.title} text-sm mb-1`}>{pattern.title}</h4>
                  <p className={`text-sm ${color.desc}`}>{pattern.description}</p>
                  {pattern.metric && (
                    <div className={`mt-2 text-xs ${color.desc} font-mono bg-white bg-opacity-50 px-2 py-1 rounded inline-block`}>
                      {pattern.metric}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
