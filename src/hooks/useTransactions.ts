import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Decimal from 'decimal.js';
import {
  transactionSchema,
  type Transaction,
  type TransactionInsert,
  type TransactionUpdate,
} from '@/lib/validations/schemas';
import { getFinancialMonthRange, isDateInFinancialMonth } from '@/lib/financialMonth';

/**
 * Custom hook for managing transactions using API routes
 * All operations go through /api/transactions with NextAuth session validation
 * Supports custom financial months based on user's payday
 */

const QUERY_KEY = 'transactions';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export const formatCurrency = (amount: number | string): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(amount));
};

export function useTransactions(month?: string, financialMonthStartDay: number = 1) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Fetch transactions query
  const {
    data: allTransactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id, month, financialMonthStartDay],
    queryFn: async () => {
      const params = new URLSearchParams();

      // For custom financial months (startDay != 1), we need to fetch a wider range
      // to ensure we get all transactions in the financial month period
      if (month && financialMonthStartDay !== 1) {
        // Get transactions from 2 months before to 1 month after to ensure coverage
        const [year, monthNum] = month.split('-').map(Number);
        const startMonth = monthNum === 1 ? 12 : monthNum - 1;
        const startYear = monthNum === 1 ? year - 1 : year;

        // Fetch without month/year params to get all transactions
        // We'll filter on the client side
      } else if (month) {
        // Standard calendar month
        const [year, monthNum] = month.split('-');
        if (year && monthNum) {
          params.append('month', monthNum);
          params.append('year', year);
        }
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch transactions');
      }

      const data = await res.json();
      return data.map((item: any) => transactionSchema.parse(item));
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter transactions by financial month if custom start day is set
  const transactions =
    month && financialMonthStartDay !== 1
      ? allTransactions.filter((t) => isDateInFinancialMonth(t.date, month, financialMonthStartDay))
      : allTransactions;

  // Create transaction mutation
  const {
    mutate: createTransaction,
    mutateAsync: createTransactionAsync,
    isPending: isCreating,
  } = useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create transaction');
      }

      const data = await res.json();
      return transactionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Update transaction mutation
  const {
    mutate: updateTransaction,
    mutateAsync: updateTransactionAsync,
    isPending: isUpdating,
  } = useMutation({
    mutationFn: async (transaction: TransactionUpdate) => {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update transaction');
      }

      const data = await res.json();
      return transactionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Delete transaction mutation
  const {
    mutate: deleteTransaction,
    mutateAsync: deleteTransactionAsync,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      return transactionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Helper functions
  const getTotalIncome = () => {
    const total = transactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: Decimal, t: Transaction) => sum.plus(toDecimal(t.amount)), new Decimal(0));
    return total.toNumber();
  };

  const getTotalExpenses = () => {
    const total = transactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: Decimal, t: Transaction) => sum.plus(toDecimal(t.amount)), new Decimal(0));
    return total.toNumber();
  };

  const getNetIncome = () => {
    return toDecimal(getTotalIncome()).minus(toDecimal(getTotalExpenses())).toNumber();
  };

  const getTransactionsByType = (type: 'income' | 'expense') => {
    return transactions.filter((t: Transaction) => t.type === type);
  };

  const getTransactionsByCategory = (categoryId: string) => {
    return transactions.filter((t: Transaction) => t.category_id === categoryId);
  };

  const calculateTotals = () => {
    const income = getTotalIncome();
    const expenses = getTotalExpenses();
    const balance = toDecimal(income).minus(toDecimal(expenses)).toNumber();

    return {
      income,
      expenses,
      balance,
      incomeFormatted: formatCurrency(income),
      expensesFormatted: formatCurrency(expenses),
      balanceFormatted: formatCurrency(balance),
    };
  };

  return {
    // Data
    transactions,
    isLoading,
    error,

    // Mutations
    createTransaction,
    createTransactionAsync,
    updateTransaction,
    updateTransactionAsync,
    deleteTransaction,
    deleteTransactionAsync,

    // Loading states
    isCreating,
    isUpdating,
    isDeleting,

    // Helpers
    getTotalIncome,
    getTotalExpenses,
    getNetIncome,
    getTransactionsByType,
    getTransactionsByCategory,
    calculateTotals,
    refetch,
  };
}
