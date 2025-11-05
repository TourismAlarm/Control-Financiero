'use client';

import { TrendingUp, TrendingDown, DollarSign, PiggyBank, AlertCircle, CheckCircle } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';

/**
 * Financial Dashboard Component
 * Displays summary cards with key financial metrics
 */

interface FinancialDashboardProps {
  month?: string;
}

export function FinancialDashboard({ month }: FinancialDashboardProps) {
  const { summary, isLoading, getCategoryBreakdown, getBudgetAlerts, getHealthScore } = useFinancialSummary(month);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800">No hay datos financieros disponibles</p>
      </div>
    );
  }

  const categoryBreakdown = getCategoryBreakdown();
  const budgetAlerts = getBudgetAlerts();
  const healthScore = getHealthScore();

  return (
    <div className="space-y-6">
      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Ingresos</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.totalIncomeFormatted}</p>
          <p className="text-xs text-gray-500 mt-1">Total del período</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Gastos</h3>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.totalExpensesFormatted}</p>
          <p className="text-xs text-gray-500 mt-1">Total del período</p>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Balance</h3>
            <div className={`p-2 rounded-lg ${summary.hasPositiveBalance ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={`w-5 h-5 ${summary.hasPositiveBalance ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${summary.hasPositiveBalance ? 'text-blue-600' : 'text-orange-600'}`}>
            {summary.balanceFormatted}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.hasPositiveBalance ? 'Superávit' : 'Déficit'}
          </p>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Tasa de Ahorro</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">{summary.savingsRateFormatted}</p>
          <p className="text-xs text-gray-500 mt-1">De tus ingresos</p>
        </div>
      </div>

      {/* Budget Status & Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budget Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Estado del Presupuesto</h3>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Presupuestado</span>
              <span className="font-medium">{summary.totalBudgetedFormatted}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Gastado</span>
              <span className="font-medium">{summary.totalExpensesFormatted}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${
                  summary.isOverBudget ? 'bg-red-600' :
                  summary.budgetUsagePercentage >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(summary.budgetUsagePercentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {summary.budgetUsagePercentage.toFixed(1)}% del presupuesto utilizado
            </p>
          </div>

          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Alertas</h4>
              {budgetAlerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertCircle className={`w-4 h-4 ${alert.isOverBudget ? 'text-red-500' : 'text-yellow-500'}`} />
                  <span className="text-gray-700">{alert.percentageUsed.toFixed(1)}% usado</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Health Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Salud Financiera</h3>

          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-gray-200"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`${
                    healthScore >= 80 ? 'text-green-500' :
                    healthScore >= 60 ? 'text-yellow-500' :
                    healthScore >= 40 ? 'text-orange-500' :
                    'text-red-500'
                  }`}
                  strokeWidth="10"
                  strokeDasharray={`${healthScore * 2.51}, 251`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{Math.round(healthScore)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {summary.hasPositiveBalance ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>{summary.hasPositiveBalance ? 'Balance positivo' : 'Balance negativo'}</span>
            </div>
            <div className="flex items-center gap-2">
              {!summary.isOverBudget ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>{!summary.isOverBudget ? 'Dentro del presupuesto' : 'Sobre presupuesto'}</span>
            </div>
            <div className="flex items-center gap-2">
              {summary.savingsRate >= 20 ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : summary.savingsRate >= 10 ? (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Tasa de ahorro: {summary.savingsRateFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 5).map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{cat.category}</span>
                  <span className="font-medium">{cat.amountFormatted} ({cat.percentageFormatted})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
