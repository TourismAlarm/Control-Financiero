'use client';

import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';

interface FinancialDashboardProps {
  month?: string;
  financialMonthStartDay?: number;
}

export function FinancialDashboard({ month, financialMonthStartDay = 1 }: FinancialDashboardProps) {
  const { summary, isLoading, getCategoryBreakdown, getBudgetAlerts, getHealthScore } = useFinancialSummary(month, financialMonthStartDay);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
        <p className="text-gray-600">No hay datos financieros disponibles</p>
      </div>
    );
  }

  const categoryBreakdown = getCategoryBreakdown();
  const budgetAlerts = getBudgetAlerts();
  const healthScore = getHealthScore();

  const healthColor =
    healthScore >= 80 ? 'text-green-600' :
    healthScore >= 60 ? 'text-yellow-500' :
    healthScore >= 40 ? 'text-orange-500' :
    'text-red-500';

  const healthBg =
    healthScore >= 80 ? 'bg-green-50 border-green-200' :
    healthScore >= 60 ? 'bg-yellow-50 border-yellow-200' :
    healthScore >= 40 ? 'bg-orange-50 border-orange-200' :
    'bg-red-50 border-red-200';

  return (
    <div className="space-y-5">

      {/* Este mes — 4 metric cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Este mes</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Ingresos */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">Ingresos</span>
              <div className="p-1.5 bg-green-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{summary.totalIncomeFormatted}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">Entradas</span>
            </div>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">Gastos</span>
              <div className="p-1.5 bg-red-100 rounded-lg">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{summary.totalExpensesFormatted}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <ArrowDownRight className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Salidas</span>
            </div>
          </div>

          {/* Balance del mes */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">Balance</span>
              <div className={`p-1.5 rounded-lg ${summary.hasPositiveBalance ? 'bg-blue-100' : 'bg-orange-100'}`}>
                {summary.hasPositiveBalance
                  ? <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  : <ArrowDownRight className="w-4 h-4 text-orange-600" />
                }
              </div>
            </div>
            <p className={`text-xl font-bold truncate ${summary.hasPositiveBalance ? 'text-blue-600' : 'text-orange-600'}`}>
              {summary.balanceFormatted}
            </p>
            <span className={`text-xs font-medium mt-1.5 block ${summary.hasPositiveBalance ? 'text-blue-500' : 'text-orange-500'}`}>
              {summary.hasPositiveBalance ? 'Superávit' : 'Déficit'}
            </span>
          </div>

          {/* Tasa de ahorro */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">Ahorro</span>
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <PiggyBank className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{summary.savingsRateFormatted}</p>
            <span className="text-xs text-purple-600 font-medium mt-1.5 block">De tus ingresos</span>
          </div>
        </div>
      </div>

      {/* Saldo total en cuentas */}
      <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Wallet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Saldo total en cuentas</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalAccountBalanceFormatted}</p>
          </div>
        </div>
      </div>

      {/* Budget status + Health score */}
      <div className={`grid gap-4 ${summary.totalBudgeted > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>

        {/* Budget Status — only when budgets exist */}
        {summary.totalBudgeted > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">Estado del Presupuesto</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Presupuestado</span>
                <span className="font-semibold text-gray-900">{summary.totalBudgetedFormatted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Gastado</span>
                <span className="font-semibold text-gray-900">{summary.totalExpensesFormatted}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all ${
                  summary.isOverBudget ? 'bg-red-500' :
                  summary.budgetUsagePercentage >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(summary.budgetUsagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {summary.budgetUsagePercentage.toFixed(1)}% utilizado
            </p>
            {budgetAlerts.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {budgetAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${alert.isOverBudget ? 'text-red-500' : 'text-yellow-500'}`} />
                    <span className="text-gray-700">{alert.percentageUsed.toFixed(0)}% del presupuesto usado</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Financial Health Score */}
        <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${summary.totalBudgeted === 0 ? 'md:max-w-sm' : ''}`}>
          <h3 className="text-base font-bold text-gray-900 mb-4">Salud Financiera</h3>
          <div className="flex items-center gap-5">
            {/* Score circle */}
            <div className={`flex-shrink-0 w-20 h-20 rounded-full border-4 flex items-center justify-center ${healthBg}`}>
              <span className={`text-2xl font-bold ${healthColor}`}>{Math.round(healthScore)}</span>
            </div>
            {/* Checklist */}
            <div className="space-y-2 text-sm flex-1">
              <div className="flex items-center gap-2">
                {summary.hasPositiveBalance
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                }
                <span className="text-gray-700">{summary.hasPositiveBalance ? 'Balance positivo' : 'Balance negativo'}</span>
              </div>
              {summary.totalBudgeted > 0 && (
                <div className="flex items-center gap-2">
                  {!summary.isOverBudget
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  }
                  <span className="text-gray-700">{!summary.isOverBudget ? 'Dentro del presupuesto' : 'Sobre presupuesto'}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {summary.savingsRate >= 20
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <AlertCircle className={`w-4 h-4 flex-shrink-0 ${summary.savingsRate >= 10 ? 'text-yellow-500' : 'text-red-500'}`} />
                }
                <span className="text-gray-700">Ahorro: {summary.savingsRateFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-4">Gastos por Categoría</h3>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 5).map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-700 font-medium">{cat.category}</span>
                  <span className="text-gray-900 font-semibold">{cat.amountFormatted} <span className="text-gray-400 font-normal">({cat.percentageFormatted})</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
