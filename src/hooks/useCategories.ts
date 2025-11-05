'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, CategoryInsert } from '@/types/database';

/**
 * Hook for managing categories with TanStack Query
 * Provides CRUD operations with automatic caching and revalidation
 */

// ==========================================
// API Functions
// ==========================================

async function fetchCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const url = type ? `/api/categories?type=${type}` : '/api/categories';

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch categories');
  }

  return response.json();
}

async function createCategory(data: Omit<CategoryInsert, 'user_id'>): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create category');
  }

  return response.json();
}

async function updateCategory(data: Partial<Category> & { id: string }): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update category');
  }

  return response.json();
}

async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`/api/categories?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete category');
  }
}

// ==========================================
// Hook
// ==========================================

export function useCategories(type?: 'income' | 'expense') {
  const queryClient = useQueryClient();

  // Query key
  const queryKey = type ? ['categories', type] : ['categories'];

  // GET - Fetch categories
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCategories(type),
  });

  // POST - Create category
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // PUT - Update category
  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // DELETE - Delete category
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // Helper functions
  const getExpenseCategories = () => categories.filter((c) => c.type === 'expense');
  const getIncomeCategories = () => categories.filter((c) => c.type === 'income');

  return {
    // Data
    categories,
    expenseCategories: getExpenseCategories(),
    incomeCategories: getIncomeCategories(),
    isLoading,
    error,

    // Actions
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    refetch,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Errors
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}
