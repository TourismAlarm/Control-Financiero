import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import Decimal from 'decimal.js';
import {
  budgetSchema,
  budgetInsertSchema,
  budgetUpdateSchema,
  type Budget,
  type BudgetInsert,
  type BudgetUpdate,
} from '@/lib/validations/schemas';
import { formatCurrency } from './useTransactions';

/**
 * Custom hook for managing budgets with TanStack Query
 * Handles budget CRUD operations with decimal calculations
 */

const QUERY_KEY = 'budgets';

const toDecimal = (value: number | string): Decimal => new Decimal(value);

export function useBudgets(month?: number, year?: number) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch budgets query
  const {
    data: budgets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id, month, year],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      let query = supabase
        .from('budgets')
        .select('*, categories(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (month !== undefined) {
        query = query.eq('month', month);
      }

      if (year !== undefined) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((item) => budgetSchema.parse(item));
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: async (budget: BudgetInsert) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const validated = budgetInsertSchema.parse({
        ...budget,
        user_id: session.user.id,
      });

      const amountDecimal = toDecimal(validated.amount);

      const insertData = {
        ...validated,
        amount: amountDecimal.toNumber(),
      };

      const { data, error } = await supabase
        .from('budgets')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return budgetSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Update budget mutation
  const updateBudget = useMutation({
    mutationFn: async (budget: BudgetUpdate) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      if (!budget.id) {
        throw new Error('Budget ID is required');
      }

      const validated = budgetUpdateSchema.parse(budget);

      const updateData: any = { ...validated };
      if (validated.amount !== undefined) {
        const amountDecimal = toDecimal(validated.amount);
        updateData.amount = amountDecimal.toNumber();
      }

      const { data, error } = await supabase
        .from('budgets')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', validated.id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return budgetSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Delete budget mutation
  const deleteBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Calculate budget usage vs actual spending
  const getBudgetStatus = (budget: Budget, actualSpending: number) => {
    const budgetAmount = toDecimal(budget.amount);
    const spending = toDecimal(actualSpending);
    const remaining = budgetAmount.minus(spending);
    const percentageUsed = budgetAmount.isZero()
      ? new Decimal(0)
      : spending.dividedBy(budgetAmount).times(100);

    const isOverBudget = spending.greaterThan(budgetAmount);
    const isNearLimit = percentageUsed.greaterThanOrEqualTo(budget.alert_threshold);

    return {
      budgetAmount: budgetAmount.toNumber(),
      spending: spending.toNumber(),
      remaining: remaining.toNumber(),
      percentageUsed: percentageUsed.toNumber(),
      isOverBudget,
      isNearLimit,
      budgetAmountFormatted: formatCurrency(budgetAmount.toNumber()),
      spendingFormatted: formatCurrency(spending.toNumber()),
      remainingFormatted: formatCurrency(remaining.toNumber()),
      percentageUsedFormatted: `${percentageUsed.toFixed(1)}%`,
    };
  };

  // Get total budgeted amount
  const getTotalBudgeted = () => {
    const total = budgets.reduce(
      (sum, budget) => sum.plus(toDecimal(budget.amount)),
      new Decimal(0)
    );

    return {
      total: total.toNumber(),
      totalFormatted: formatCurrency(total.toNumber()),
    };
  };

  // Get total budget for a specific month (format: "YYYY-MM")
  const getTotalBudget = (monthString: string) => {
    const filteredBudgets = budgets.filter((b) => {
      // Parse budget month/year and compare with monthString
      const budgetMonth = `${b.year}-${String(b.month).padStart(2, '0')}`;
      return budgetMonth === monthString;
    });

    const total = filteredBudgets.reduce(
      (sum, budget) => sum.plus(toDecimal(budget.amount)),
      new Decimal(0)
    );

    return {
      total: total.toNumber(),
      totalFormatted: formatCurrency(total.toNumber()),
    };
  };

  // Get budget usage for a specific budget (returns budget amount without spending data)
  // Note: To calculate actual spending, the component should use useTransactions
  const getBudgetUsage = (budgetId: string) => {
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) {
      return null;
    }

    return {
      budgeted: budget.amount,
      spent: 0, // Component should calculate this using useTransactions
    };
  };

  // Check if budget is over limit (requires actual spending data)
  // Returns false by default - component should calculate actual spending
  const isOverBudget = (_budgetId: string) => {
    return false; // Component should calculate this using useTransactions
  };

  // Get budgets by category
  const getBudgetsByCategory = (categoryId: string) => {
    return budgets.filter((b) => b.category_id === categoryId);
  };

  return {
    // Data
    budgets,
    isLoading,
    error,

    // Mutations
    createBudget: createBudget.mutate,
    updateBudget: updateBudget.mutate,
    deleteBudget: deleteBudget.mutate,

    // Mutation states
    isCreating: createBudget.isPending,
    isUpdating: updateBudget.isPending,
    isDeleting: deleteBudget.isPending,

    // Helpers
    refetch,
    getBudgetStatus,
    getTotalBudgeted,
    getTotalBudget,
    getBudgetUsage,
    isOverBudget,
    getBudgetsByCategory,
  };
}
