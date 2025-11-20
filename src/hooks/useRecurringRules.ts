import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import Decimal from 'decimal.js';
import {
  recurringRuleSchema,
  recurringRuleInsertSchema,
  recurringRuleUpdateSchema,
  type RecurringRule,
  type RecurringRuleInsert,
  type RecurringRuleUpdate,
} from '@/lib/validations/schemas';
import { formatCurrency } from './useTransactions';

/**
 * Custom hook for managing recurring transaction rules with TanStack Query
 * Handles recurring rule CRUD operations
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
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch recurring rules query
  const {
    data: recurringRules = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item) => recurringRuleSchema.parse(item));
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create recurring rule mutation
  const createRecurringRule = useMutation({
    mutationFn: async (rule: RecurringRuleInsert) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const validated = recurringRuleInsertSchema.parse({
        ...rule,
        user_id: session.user.id,
      });

      const amountDecimal = toDecimal(validated.amount);

      const { data, error } = await supabase
        .from('recurring_rules')
        .insert({
          ...validated,
          amount: amountDecimal.toNumber(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select()
        .single();

      if (error) throw error;
      return recurringRuleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Update recurring rule mutation
  const updateRecurringRule = useMutation({
    mutationFn: async (rule: RecurringRuleUpdate) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      if (!rule.id) {
        throw new Error('Recurring rule ID is required');
      }

      const validated = recurringRuleUpdateSchema.parse(rule);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...validated };
      if (validated.amount !== undefined) {
        const amountDecimal = toDecimal(validated.amount);
        updateData.amount = amountDecimal.toNumber();
      }

      const { data, error } = await supabase
        .from('recurring_rules')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', validated.id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return recurringRuleSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Delete recurring rule mutation
  const deleteRecurringRule = useMutation({
    mutationFn: async (ruleId: string) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const { error } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return ruleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Toggle active status
  const toggleRecurringRule = useMutation({
    mutationFn: async (ruleId: string) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const rule = recurringRules.find((r) => r.id === ruleId);
      if (!rule) {
        throw new Error('Recurring rule not found');
      }

      const { data, error } = await supabase
        .from('recurring_rules')
        // @ts-expect-error - Supabase type inference issue
        .update({ is_active: !rule.is_active })
        .eq('id', ruleId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
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
    createRecurringRule: createRecurringRule.mutate,
    updateRecurringRule: updateRecurringRule.mutate,
    deleteRecurringRule: deleteRecurringRule.mutate,
    toggleRecurringRule: toggleRecurringRule.mutate,

    // Mutation states
    isCreating: createRecurringRule.isPending,
    isUpdating: updateRecurringRule.isPending,
    isDeleting: deleteRecurringRule.isPending,
    isToggling: toggleRecurringRule.isPending,

    // Helpers
    refetch,
    getActiveRules,
    getRulesByType,
    getUpcomingRules,
    calculateMonthlyImpact,
    FREQUENCY_LABELS,
  };
}
