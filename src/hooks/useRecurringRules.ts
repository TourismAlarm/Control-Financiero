import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Decimal from 'decimal.js';
import {
  recurringRuleSchema,
  type RecurringRule,
  type RecurringRuleInsert,
  type RecurringRuleUpdate,
} from '@/lib/validations/schemas';
import { formatCurrency } from './useTransactions';

/**
 * Custom hook for managing recurring transaction rules using API routes
 * All operations go through /api/recurring-rules with NextAuth session validation
 */

const QUERY_KEY = 'recurring-rules';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

const FREQUENCY_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
} as const;

export function useRecurringRules() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Fetch recurring rules query
  const {
    data: recurringRules = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/recurring-rules');

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch recurring rules');
      }

      const data = await res.json();
      return data.map((item: any) => recurringRuleSchema.parse(item));
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create recurring rule mutation
  const {
    mutate: createRecurringRule,
    mutateAsync: createRecurringRuleAsync,
    isPending: isCreating,
  } = useMutation({
    mutationFn: async (rule: RecurringRuleInsert) => {
      const res = await fetch('/api/recurring-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create recurring rule');
      }

      const data = await res.json();
      return recurringRuleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Update recurring rule mutation
  const {
    mutate: updateRecurringRule,
    mutateAsync: updateRecurringRuleAsync,
    isPending: isUpdating,
  } = useMutation({
    mutationFn: async (rule: RecurringRuleUpdate) => {
      const res = await fetch('/api/recurring-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update recurring rule');
      }

      const data = await res.json();
      return recurringRuleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Delete recurring rule mutation
  const {
    mutate: deleteRecurringRule,
    mutateAsync: deleteRecurringRuleAsync,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/recurring-rules?id=${ruleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete recurring rule');
      }

      return ruleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Toggle active status
  const {
    mutate: toggleRecurringRule,
    mutateAsync: toggleRecurringRuleAsync,
    isPending: isToggling,
  } = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/recurring-rules?id=${ruleId}&action=toggle`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to toggle recurring rule');
      }

      const data = await res.json();
      return recurringRuleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Get active recurring rules
  const getActiveRules = () => {
    return recurringRules.filter((r) => r.is_active);
  };

  // Get rules by type
  const getRulesByType = (type: RecurringRule['type']) => {
    return recurringRules.filter((r) => r.type === type && r.is_active);
  };

  // Get upcoming rules (next_occurrence within next 7 days)
  const getUpcomingRules = () => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return recurringRules.filter((r) => {
      if (!r.is_active) return false;
      const nextOccurrence = new Date(r.next_occurrence);
      return nextOccurrence >= today && nextOccurrence <= sevenDaysFromNow;
    });
  };

  // Calculate monthly impact (sum of monthly recurring transactions)
  const calculateMonthlyImpact = () => {
    const activeRules = getActiveRules();

    const income = activeRules
      .filter((r) => r.type === 'income')
      .reduce((sum, rule) => {
        const amount = toDecimal(rule.amount);
        const monthlyAmount = getMonthlyEquivalent(rule.frequency, amount);
        return sum.plus(monthlyAmount);
      }, new Decimal(0));

    const expenses = activeRules
      .filter((r) => r.type === 'expense')
      .reduce((sum, rule) => {
        const amount = toDecimal(rule.amount);
        const monthlyAmount = getMonthlyEquivalent(rule.frequency, amount);
        return sum.plus(monthlyAmount);
      }, new Decimal(0));

    const balance = income.minus(expenses);

    return {
      income: income.toNumber(),
      incomeFormatted: formatCurrency(income.toNumber()),
      expenses: expenses.toNumber(),
      expensesFormatted: formatCurrency(expenses.toNumber()),
      balance: balance.toNumber(),
      balanceFormatted: formatCurrency(balance.toNumber()),
    };
  };

  // Convert frequency to monthly equivalent multiplier
  const getMonthlyEquivalent = (
    frequency: RecurringRule['frequency'],
    amount: Decimal
  ): Decimal => {
    switch (frequency) {
      case 'daily':
        return amount.times(30); // Approx 30 days per month
      case 'weekly':
        return amount.times(4.33); // Approx 4.33 weeks per month
      case 'biweekly':
        return amount.times(2.17); // Approx 2.17 biweeks per month
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount.dividedBy(3);
      case 'yearly':
        return amount.dividedBy(12);
      default:
        return amount;
    }
  };

  return {
    // Data
    recurringRules,
    isLoading,
    error,

    // Mutations
    createRecurringRule,
    createRecurringRuleAsync,
    updateRecurringRule,
    updateRecurringRuleAsync,
    deleteRecurringRule,
    deleteRecurringRuleAsync,
    toggleRecurringRule,
    toggleRecurringRuleAsync,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,

    // Helpers
    refetch,
    getActiveRules,
    getRulesByType,
    getUpcomingRules,
    calculateMonthlyImpact,
    FREQUENCY_LABELS,
  };
}
