'use client';

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

// Import chart components
import { IncomeVsExpenses } from '@/components/charts/IncomeVsExpenses';
import { CategoryDistribution } from '@/components/charts/CategoryDistribution';
import { MonthlyTrends } from '@/components/charts/MonthlyTrends';
import { ExpenseProjection } from '@/components/charts/ExpenseProjection';
import { PatternDetector } from '@/components/charts/PatternDetector';

// Import intelligent agents
import { BudgetRecommendations } from '@/components/agents/BudgetRecommendations';
import { AnomalyDetector } from '@/components/agents/AnomalyDetector';
import { SmartNotifications } from '@/components/agents/SmartNotifications';

/**
 * Statistics Component
 * Displays advanced financial statistics and data visualizations
 * Future enhancement: Add Chart.js or Recharts for visual graphs
 */

export function Statistics() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { calculateTotals } = useTransactions(selectedMonth);
  const { transactions: allTransactions = [] } = useTransactions(); // Para los gráficos de tendencias
  const { getTotalBalance, getBalanceByType } = useAccounts();
  const { summary, getCategoryBreakdown: getSummaryCategoryBreakdown, getHealthScore } =
    useFinancialSummary(selectedMonth);
  const { getTotalSavings } = useSavingsGoals();
  const { calculateMonthlyImpact } = useRecurringRules();

  const totals = calculateTotals();
  const totalBalance = getTotalBalance();
  const balanceByType = getBalanceByType();
  const totalSavings = getTotalSavings();
  const monthlyImpact = calculateMonthlyImpact();
  const healthScore = getHealthScore();
  const summaryCategoryBreakdown = getSummaryCategoryBreakdown();

  // Calculate month-over-month trend (simplified version)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Balance Total</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalBalance.totalFormatted}</p>
          <p className="text-xs text-gray-500 mt-1">En todas las cuentas</p>
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`p-2 rounded-lg ${
                healthScore >= 80
                  ? 'bg-green-100'
                  : healthScore >= 60
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}
            >
              <Activity
                className={`w-5 h-5 ${
                  healthScore >= 80
                    ? 'text-green-600'
                    : healthScore >= 60
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Salud Financiera</h3>
          </div>
          <p
            className={`text-2xl font-bold ${
              healthScore >= 80
                ? 'text-green-600'
                : healthScore >= 60
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {Math.round(healthScore)}/100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {healthScore >= 80
              ? 'Excelente'
              : healthScore >= 60
              ? 'Aceptable'
              : 'Necesita atención'}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Tasa de Ahorro</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600">{savingsRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">De tus ingresos</p>
        </div>

        {/* Budget Usage */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PieChart className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">Uso de Presupuesto</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">{budgetUsage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Del total presupuestado</p>
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Ingresos vs Gastos - {selectedMonth}
        </h3>
        <div className="space-y-4">
          {/* Income */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Ingresos</span>
              </div>
              <span className="text-sm font-bold text-green-600">{totals.incomeFormatted}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Gastos</span>
              </div>
              <span className="text-sm font-bold text-red-600">{totals.expensesFormatted}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{
                  width: `${
                    totals.income > 0 ? Math.min((totals.expenses / totals.income) * 100, 100) : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* Balance */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Balance del Mes</span>
              <span
                className={`text-lg font-bold ${
                  totals.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {totals.balanceFormatted}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Expense Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Categorías de Gastos</h3>
          {summaryCategoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {summaryCategoryBreakdown.slice(0, 5).map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{cat.category}</span>
                    <span className="font-medium">
                      {cat.amountFormatted} ({cat.percentageFormatted})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              No hay datos de gastos para este mes
            </p>
          )}
        </div>

        {/* Account Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Cuentas</h3>
          {balanceByType.length > 0 ? (
            <div className="space-y-3">
              {balanceByType.map((item, i) => {
                const percentage =
                  totalBalance.total > 0 ? (item.balance / totalBalance.total) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{item.type}</span>
                      <span className="font-medium">
                        {item.balanceFormatted} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No hay cuentas registradas</p>
          )}
        </div>
      </div>

      {/* Recurring Transactions Impact */}
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
          <div
            className={`rounded-lg p-4 ${
              monthlyImpact.balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}
          >
            <p
              className={`text-xs font-medium mb-1 ${
                monthlyImpact.balance >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}
            >
              Balance Recurrente/Mes
            </p>
            <p
              className={`text-2xl font-bold ${
                monthlyImpact.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              {monthlyImpact.balanceFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Savings Goals Progress */}
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

      {/* Interactive Charts */}
      <div className="space-y-6">
        {/* Income vs Expenses Chart */}
        <IncomeVsExpenses transactions={allTransactions} />

        {/* Category Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDistribution transactions={allTransactions} type="expense" />
          <CategoryDistribution transactions={allTransactions} type="income" />
        </div>

        {/* Monthly Trends */}
        <MonthlyTrends transactions={allTransactions} months={12} />

        {/* Expense Projection */}
        <ExpenseProjection transactions={allTransactions} projectionMonths={3} />

        {/* Pattern Detector */}
        <PatternDetector transactions={allTransactions} />
      </div>

      {/* Intelligent Agents Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Agentes Inteligentes</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Análisis automático basado en tus patrones de gasto y comportamiento financiero
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Smart Notifications */}
          <SmartNotifications maxVisible={5} />

          {/* Anomaly Detector */}
          <AnomalyDetector />
        </div>

        {/* Budget Recommendations - Full Width */}
        <div className="mt-6">
          <BudgetRecommendations />
        </div>
      </div>
    </div>
  );
}
