import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Decimal from 'decimal.js';
import {
  accountSchema,
  type Account,
  type AccountInsert,
  type AccountUpdate,
} from '@/lib/validations/schemas';

/**
 * Custom hook for managing accounts using API routes
 * All operations go through /api/accounts with NextAuth session validation
 */

const QUERY_KEY = 'accounts';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export const formatCurrency = (amount: number, currency = 'EUR'): string => {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
  const symbol = symbols[currency] || currency;
  const isNegative = amount < 0;
  return `${isNegative ? '-' : ''}${symbol}${Math.abs(amount).toFixed(2)}`;
};

export function useAccounts() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Fetch accounts query
  const {
    data: accounts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/accounts');

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch accounts');
      }

      const data = await res.json();
      return data.map((item: any) => accountSchema.parse(item));
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create account mutation
  const {
    mutate: createAccount,
    mutateAsync: createAccountAsync,
    isPending: isCreating,
  } = useMutation({
    mutationFn: async (account: AccountInsert) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create account');
      }

      const data = await res.json();
      return accountSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Update account mutation
  const {
    mutate: updateAccount,
    mutateAsync: updateAccountAsync,
    isPending: isUpdating,
  } = useMutation({
    mutationFn: async (account: AccountUpdate) => {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update account');
      }

      const data = await res.json();
      return accountSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Delete account mutation
  const {
    mutate: deleteAccount,
    mutateAsync: deleteAccountAsync,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      return accountId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Helper functions
  const getTotalBalance = () => {
    const total = accounts
      .filter((acc: Account) => acc.is_active)
      .reduce((sum: Decimal, acc: Account) => sum.plus(toDecimal(acc.balance)), new Decimal(0));

    return {
      total: total.toNumber(),
      totalFormatted: formatCurrency(total.toNumber()),
    };
  };

  const getBalanceByType = () => {
    const byType = accounts
      .filter((acc: Account) => acc.is_active)
      .reduce((acc: Record<string, Decimal>, account: Account) => {
        const type = account.type;
        const current = acc[type] || new Decimal(0);
        acc[type] = current.plus(toDecimal(account.balance));
        return acc;
      }, {} as Record<string, Decimal>);

    return Object.entries(byType).map(([type, balance]) => {
      const decimalBalance = balance as Decimal;
      return {
        type,
        balance: decimalBalance.toNumber(),
        balanceFormatted: formatCurrency(decimalBalance.toNumber()),
      };
    });
  };

  const getAccountById = (accountId: string) => {
    return accounts.find((acc: Account) => acc.id === accountId);
  };

  return {
    // Data
    accounts,
    isLoading,
    error,

    // Mutations
    createAccount,
    createAccountAsync,
    updateAccount,
    updateAccountAsync,
    deleteAccount,
    deleteAccountAsync,

    // Loading states
    isCreating,
    isUpdating,
    isDeleting,

    // Helpers
    getTotalBalance,
    getBalanceByType,
    getAccountById,
    refetch,
  };
}
