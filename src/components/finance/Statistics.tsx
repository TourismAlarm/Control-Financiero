'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  Activity,
  Brain,
} from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useRecurringRules } from '@/hooks/useRecurringRules';

// Dynamic imports — ssr:false to avoid Recharts hydration issues
const IncomeVsExpenses = dynamic(
  () => import('@/components/charts/IncomeVsExpenses').then(m => m.IncomeVsExpenses),
  { ssr: false, loading: () => <ChartPlaceholder title="Ingresos vs Gastos" /> }
);
const CategoryDistribution = dynamic(
  () => import('@/components/charts/CategoryDistribution').then(m => m.CategoryDistribution),
  { ssr: false, loading: () => <ChartPlaceholder title="Distribución" /> }
);
const MonthlyTrends = dynamic(
  () => import('@/components/charts/MonthlyTrends').then(m => m.MonthlyTrends),
  { ssr: false, loading: () => <ChartPlaceholder title="Tendencias" /> }
);
const ExpenseProjection = dynamic(
  () => import('@/components/charts/ExpenseProjection').then(m => m.ExpenseProjection),
  { ssr: false, loading: () => <ChartPlaceholder title="Proyección" /> }
);
const PatternDetector = dynamic(
  () => import('@/components/charts/PatternDetector').then(m => m.PatternDetector),
  { ssr: false, loading: () => <ChartPlaceholder title="Patrones" /> }
);

// Import intelligent agents
import { BudgetRecommendations } from '@/components/agents/BudgetRecommendations';
import { AnomalyDetector } from '@/components/agents/AnomalyDetector';
import { SmartNotifications } from '@/components/agents/SmartNotifications';

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
      <div className="h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
    </div>
  );
}

export function Statistics() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { transactions: allTransactions = [] } = useTransactions();
  const { getTotalBalance, getBalanceByType } = useAccounts();
  const { summary, getHealthScore } = useFinancialSummary(selectedMonth);
  const { getTotalSavings } = useSavingsGoals();
  const { calculateMonthlyImpact } = useRecurringRules();

  const totalBalance = getTotalBalance();
  const balanceByType = getBalanceByType();
  const totalSavings = getTotalSavings();
  const monthlyImpact = calculateMonthlyImpact();
  const healthScore = getHealthScore();

  const savingsRate = summary?.savingsRate || 0;
  const budgetUsage = summary?.budgetUsagePercentage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Estadísticas Financieras</h2>
            </div>
            <p className="text-blue-100 text-sm">Análisis detallado de tu situación financiera</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-200" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-blue-700/50 text-white px-3 py-1 rounded-lg border border-blue-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-xs font-medium text-gray-500">Balance Total</h3>
          </div>
          <p className="text-xl font-bold text-gray-900">{totalBalance.totalFormatted}</p>
          <p className="text-xs text-gray-400 mt-0.5">En todas las cuentas</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${healthScore >= 80 ? 'bg-green-100' : healthScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Activity className={`w-4 h-4 ${healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            <h3 className="text-xs font-medium text-gray-500">Salud Financiera</h3>
          </div>
          <p className={`text-xl font-bold ${healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {Math.round(healthScore)}/100
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Aceptable' : 'Necesita atención'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-xs font-medium text-gray-500">Tasa de Ahorro</h3>
          </div>
          <p className="text-xl font-bold text-purple-600">{savingsRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">De tus ingresos</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PieChart className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="text-xs font-medium text-gray-500">Uso Presupuesto</h3>
          </div>
          <p className="text-xl font-bold text-orange-600">{budgetUsage.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">Del total presupuestado</p>
        </div>
      </div>

      {/* === CHARTS === */}
      {/* 1. Ingresos vs Gastos — 6 meses */}
      <IncomeVsExpenses transactions={allTransactions as any} />

      {/* 2. Distribución por categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistribution transactions={allTransactions as any} type="expense" />
        <CategoryDistribution transactions={allTransactions as any} type="income" />
      </div>

      {/* 3. Tendencias mensuales */}
      <MonthlyTrends transactions={allTransactions as any} months={12} />

      {/* 4. Proyección */}
      <ExpenseProjection transactions={allTransactions as any} projectionMonths={3} />

      {/* 5. Detección de patrones */}
      <PatternDetector transactions={allTransactions as any} />

      {/* === SECONDARY STATS === */}
      {/* Account distribution */}
      {balanceByType.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-gray-500" /> Distribución de Cuentas
          </h3>
          <div className="space-y-3">
            {balanceByType.map((item, i) => {
              const pct = totalBalance.total > 0 ? (item.balance / totalBalance.total) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{item.type}</span>
                    <span className="font-medium">{item.balanceFormatted} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurring impact */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Impacto de Transacciones Recurrentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-700 font-medium mb-1">Ingresos Recurrentes/Mes</p>
            <p className="text-2xl font-bold text-green-600">{monthlyImpact.incomeFormatted}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs text-red-700 font-medium mb-1">Gastos Recurrentes/Mes</p>
            <p className="text-2xl font-bold text-red-600">{monthlyImpact.expensesFormatted}</p>
          </div>
          <div className={`rounded-lg p-4 ${monthlyImpact.balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className={`text-xs font-medium mb-1 ${monthlyImpact.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance Recurrente/Mes</p>
            <p className={`text-2xl font-bold ${monthlyImpact.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {monthlyImpact.balanceFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Savings goals */}
      {totalSavings.activeCount > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Progreso de Metas de Ahorro</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-700 font-medium mb-1">Total Ahorrado</p>
              <p className="text-2xl font-bold text-green-600">{totalSavings.totalFormatted}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-700 font-medium mb-1">Objetivo Total</p>
              <p className="text-2xl font-bold text-blue-600">{totalSavings.targetFormatted}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-700 font-medium mb-1">Metas Activas</p>
              <p className="text-2xl font-bold text-purple-600">{totalSavings.activeCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Intelligent Agents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Agentes Inteligentes</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SmartNotifications maxVisible={5} />
          <AnomalyDetector />
        </div>
        <div className="mt-6">
          <BudgetRecommendations />
        </div>
      </div>
    </div>
  );
}
