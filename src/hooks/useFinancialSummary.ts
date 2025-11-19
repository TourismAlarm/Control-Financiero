import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Decimal from 'decimal.js';
import { useTransactions } from './useTransactions';
import { useAccounts } from './useAccounts';
import { useBudgets } from './useBudgets';
import { formatCurrency } from './useTransactions';
import type { Transaction } from '@/lib/validations/schemas';

/**
 * Custom hook for calculating financial summary and insights
 * Aggregates data from transactions, accounts, and budgets
 */

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export interface FinancialSummary {
  // Income & Expenses
  totalIncome: number;
  totalExpenses: number;
  balance: number;

  // Formatted values
  totalIncomeFormatted: string;
  totalExpensesFormatted: string;
  balanceFormatted: string;

  // Account totals
  totalAccountBalance: number;
  totalAccountBalanceFormatted: string;

  // Budget info
  totalBudgeted: number;
  totalBudgetedFormatted: string;
  budgetUsagePercentage: number;

  // Insights
  savingsRate: number;
  savingsRateFormatted: string;
  isOverBudget: boolean;
  hasPositiveBalance: boolean;

  // Month comparison
  monthlyChange?: {
    incomeChange: number;
    incomeChangePercent: number;
    expenseChange: number;
    expenseChangePercent: number;
  };
}

export function useFinancialSummary(month?: string) {
  const { data: session } = useSession();
  const { transactions, calculateTotals, isLoading: transactionsLoading } = useTransactions(month);
  const { accounts: _accounts, getTotalBalance, isLoading: accountsLoading } = useAccounts();
  const { budgets, getTotalBudgeted, isLoading: budgetsLoading } = useBudgets();

  // Calculate financial summary
  const summary = useQuery<FinancialSummary>({
    queryKey: ['financial-summary', session?.user?.id, month, transactions.length],
    queryFn: () => {
      // Calculate transaction totals
      const transactionTotals = calculateTotals();

      // Calculate account totals
      const accountTotals = getTotalBalance();

      // Calculate budget totals
      const budgetTotals = getTotalBudgeted();

      // Calculate savings rate (percentage of income saved)
      const incomeDecimal = toDecimal(transactionTotals.income);
      const expensesDecimal = toDecimal(transactionTotals.expenses);
      const savingsDecimal = incomeDecimal.minus(expensesDecimal);

      const savingsRate = incomeDecimal.isZero()
        ? new Decimal(0)
        : savingsDecimal.dividedBy(incomeDecimal).times(100);

      // Calculate budget usage
      const budgetedDecimal = toDecimal(budgetTotals.total);
      const budgetUsagePercentage = budgetedDecimal.isZero()
        ? new Decimal(0)
        : expensesDecimal.dividedBy(budgetedDecimal).times(100);

      const isOverBudget = expensesDecimal.greaterThan(budgetedDecimal);
      const hasPositiveBalance = savingsDecimal.greaterThan(0);

      return {
        totalIncome: transactionTotals.income,
        totalExpenses: transactionTotals.expenses,
        balance: transactionTotals.balance,
        totalIncomeFormatted: transactionTotals.incomeFormatted,
        totalExpensesFormatted: transactionTotals.expensesFormatted,
        balanceFormatted: transactionTotals.balanceFormatted,
        totalAccountBalance: accountTotals.total,
        totalAccountBalanceFormatted: accountTotals.totalFormatted,
        totalBudgeted: budgetTotals.total,
        totalBudgetedFormatted: budgetTotals.totalFormatted,
        budgetUsagePercentage: budgetUsagePercentage.toNumber(),
        savingsRate: savingsRate.toNumber(),
        savingsRateFormatted: `${savingsRate.toFixed(1)}%`,
        isOverBudget,
        hasPositiveBalance,
      };
    },
    enabled: !!session?.user?.id && !transactionsLoading && !accountsLoading && !budgetsLoading,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Get category breakdown with percentages
  const getCategoryBreakdown = () => {
    const totalExpenses = toDecimal(summary.data?.totalExpenses || 0);

    if (totalExpenses.isZero()) {
      return [];
    }

    const categoryMap = new Map<string, { amount: Decimal; category: string }>();

    transactions
      .filter((t: Transaction) => t.type === 'expense' && t.category_id)
      .forEach((t: Transaction) => {
        const categoryId = t.category_id!;
        const current = categoryMap.get(categoryId) || { amount: new Decimal(0), category: categoryId };
        categoryMap.set(categoryId, {
          amount: current.amount.plus(toDecimal(t.amount)),
          category: categoryId,
        });
      });

    return Array.from(categoryMap.values())
      .map(({ amount, category }) => {
        const percentage = amount.dividedBy(totalExpenses).times(100);
        return {
          category,
          amount: amount.toNumber(),
          amountFormatted: formatCurrency(amount.toNumber()),
          percentage: percentage.toNumber(),
          percentageFormatted: `${percentage.toFixed(1)}%`,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  // Get spending trend (comparing to previous periods)
  const getSpendingTrend = (_periods: number = 6) => {
    // This would require historical data analysis
    // For now, return empty array - to be implemented with historical data
    return [];
  };

  // Get budget alerts (budgets that are over threshold)
  const getBudgetAlerts = () => {
    if (!summary.data) return [];

    const alerts: Array<{
      budgetId: string;
      category: string;
      percentageUsed: number;
      isOverBudget: boolean;
      isNearLimit: boolean;
    }> = [];

    budgets.forEach((budget) => {
      const categoryExpenses = transactions
        .filter((t: Transaction) => t.type === 'expense' && t.category_id === budget.category_id)
        .reduce((sum: Decimal, t: Transaction) => sum.plus(toDecimal(t.amount)), new Decimal(0));

      const budgetAmount = toDecimal(budget.amount);
      const percentageUsed = budgetAmount.isZero()
        ? new Decimal(0)
        : categoryExpenses.dividedBy(budgetAmount).times(100);

      const isOverBudget = categoryExpenses.greaterThan(budgetAmount);
      const isNearLimit = percentageUsed.greaterThanOrEqualTo(budget.alert_threshold);

      if (isOverBudget || isNearLimit) {
        alerts.push({
          budgetId: budget.id!,
          category: budget.category_id,
          percentageUsed: percentageUsed.toNumber(),
          isOverBudget,
          isNearLimit,
        });
      }
    });

    return alerts.sort((a, b) => b.percentageUsed - a.percentageUsed);
  };

  // Get financial health score (0-100)
  const getHealthScore = () => {
    if (!summary.data) return 0;

    let score = new Decimal(100);

    // Deduct points for negative balance
    if (!summary.data.hasPositiveBalance) {
      score = score.minus(30);
    }

    // Deduct points for being over budget
    if (summary.data.isOverBudget) {
      score = score.minus(20);
    }

    // Deduct points for low savings rate
    const savingsRate = toDecimal(summary.data.savingsRate);
    if (savingsRate.lessThan(10)) {
      score = score.minus(20);
    } else if (savingsRate.lessThan(20)) {
      score = score.minus(10);
    }

    // Deduct points for budget alerts
    const alerts = getBudgetAlerts();
    score = score.minus(alerts.length * 5);

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score.toNumber()));
  };

  return {
    // Main summary data
    summary: summary.data,
    isLoading: summary.isLoading || transactionsLoading || accountsLoading || budgetsLoading,
    error: summary.error,
    refetch: summary.refetch,

    // Helper functions
    getCategoryBreakdown,
    getSpendingTrend,
    getBudgetAlerts,
    getHealthScore,
  };
}
