import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import Decimal from 'decimal.js';
import {
  savingsGoalSchema,
  savingsGoalInsertSchema,
  savingsGoalUpdateSchema,
  type SavingsGoalInsert,
  type SavingsGoalUpdate,
} from '@/lib/validations/schemas';
import { formatCurrency } from './useTransactions';

/**
 * Custom hook for managing savings goals with TanStack Query
 * Handles savings goal CRUD operations with decimal calculations
 */

const QUERY_KEY = 'savings-goals';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export function useSavingsGoals() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch savings goals query
  const {
    data: savingsGoals = [],
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
        .from('savings_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item) => savingsGoalSchema.parse(item));
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create savings goal mutation
  const createSavingsGoal = useMutation({
    mutationFn: async (goal: SavingsGoalInsert) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const validated = savingsGoalInsertSchema.parse({
        ...goal,
        user_id: session.user.id,
      });

      const targetDecimal = toDecimal(validated.target_amount);
      const currentDecimal = toDecimal(validated.current_amount || 0);

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          ...validated,
          target_amount: targetDecimal.toNumber(),
          current_amount: currentDecimal.toNumber(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select()
        .single();

      if (error) throw error;
      return savingsGoalSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Update savings goal mutation
  const updateSavingsGoal = useMutation({
    mutationFn: async (goal: SavingsGoalUpdate) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      if (!goal.id) {
        throw new Error('Savings goal ID is required');
      }

      const validated = savingsGoalUpdateSchema.parse(goal);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...validated };
      if (validated.target_amount !== undefined) {
        const targetDecimal = toDecimal(validated.target_amount);
        updateData.target_amount = targetDecimal.toNumber();
      }
      if (validated.current_amount !== undefined) {
        const currentDecimal = toDecimal(validated.current_amount);
        updateData.current_amount = currentDecimal.toNumber();
      }

      const { data, error } = await supabase
        .from('savings_goals')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', validated.id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return savingsGoalSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Delete savings goal mutation
  const deleteSavingsGoal = useMutation({
    mutationFn: async (goalId: string) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return goalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Add amount to savings goal
  const addToGoal = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number | string }) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const goal = savingsGoals.find((g) => g.id === goalId);
      if (!goal) {
        throw new Error('Savings goal not found');
      }

      const currentAmount = toDecimal(goal.current_amount);
      const addAmount = toDecimal(amount);
      const newAmount = currentAmount.plus(addAmount);

      // Check if goal is now completed
      const targetAmount = toDecimal(goal.target_amount);
      const isCompleted = newAmount.greaterThanOrEqualTo(targetAmount);

      const { data, error } = await supabase
        .from('savings_goals')
        // @ts-expect-error - Supabase type inference issue
        .update({
          current_amount: newAmount.toNumber(),
          is_completed: isCompleted,
        })
        .eq('id', goalId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return savingsGoalSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Get goal progress
  const getGoalProgress = (goalId: string) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return null;

    const current = toDecimal(goal.current_amount);
    const target = toDecimal(goal.target_amount);
    const remaining = target.minus(current);
    const percentage = target.greaterThan(0) ? current.dividedBy(target).times(100) : new Decimal(0);

    return {
      current: current.toNumber(),
      currentFormatted: formatCurrency(current.toNumber()),
      target: target.toNumber(),
      targetFormatted: formatCurrency(target.toNumber()),
      remaining: remaining.toNumber(),
      remainingFormatted: formatCurrency(remaining.toNumber()),
      percentage: percentage.toNumber(),
      percentageFormatted: `${percentage.toFixed(1)}%`,
      isCompleted: goal.is_completed,
    };
  };

  // Get active goals
  const getActiveGoals = () => {
    return savingsGoals.filter((g) => !g.is_completed);
  };

  // Get completed goals
  const getCompletedGoals = () => {
    return savingsGoals.filter((g) => g.is_completed);
  };

  // Calculate total savings
  const getTotalSavings = () => {
    const total = savingsGoals.reduce((sum, goal) => {
      return sum.plus(toDecimal(goal.current_amount));
    }, new Decimal(0));

    const target = savingsGoals
      .filter((g) => !g.is_completed)
      .reduce((sum, goal) => {
        return sum.plus(toDecimal(goal.target_amount));
      }, new Decimal(0));

    const remaining = target.minus(total);

    return {
      total: total.toNumber(),
      totalFormatted: formatCurrency(total.toNumber()),
      target: target.toNumber(),
      targetFormatted: formatCurrency(target.toNumber()),
      remaining: remaining.toNumber(),
      remainingFormatted: formatCurrency(remaining.toNumber()),
      completedCount: savingsGoals.filter((g) => g.is_completed).length,
      activeCount: savingsGoals.filter((g) => !g.is_completed).length,
    };
  };

  // Get goals approaching target date
  const getUpcomingDeadlines = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return savingsGoals.filter((g) => {
      if (g.is_completed || !g.target_date) return false;
      const targetDate = new Date(g.target_date);
      return targetDate >= today && targetDate <= thirtyDaysFromNow;
    });
  };

  return {
    // Data
    savingsGoals,
    isLoading,
    error,

    // Mutations
    createSavingsGoal: createSavingsGoal.mutate,
    updateSavingsGoal: updateSavingsGoal.mutate,
    deleteSavingsGoal: deleteSavingsGoal.mutate,
    addToGoal: addToGoal.mutate,

    // Mutation states
    isCreating: createSavingsGoal.isPending,
    isUpdating: updateSavingsGoal.isPending,
    isDeleting: deleteSavingsGoal.isPending,
    isAdding: addToGoal.isPending,

    // Helpers
    refetch,
    getGoalProgress,
    getActiveGoals,
    getCompletedGoals,
    getTotalSavings,
    getUpcomingDeadlines,
  };
}
