import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Decimal from 'decimal.js';
import {
  transactionSchema,
  type Transaction,
  type TransactionInsert,
  type TransactionUpdate,
} from '@/lib/validations/schemas';

/**
 * Custom hook for managing transactions using API routes
 * All operations go through /api/transactions with NextAuth session validation
 */

const QUERY_KEY = 'transactions';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export const formatCurrency = (amount: number | string): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(amount));
};

export function useTransactions(month?: string) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Fetch transactions query
  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id, month],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (month) {
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
