import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategorySuggestion } from '@/lib/ml/categorization';

interface MLCategorizationParams {
  description: string;
  amount?: number;
  type?: 'income' | 'expense';
}

interface MLCategorizationResponse {
  suggestions: CategorySuggestion[];
  stats: {
    version: string;
    trainingDataSize: number;
    patternsCount: number;
    lastTrained: string;
    categoriesTracked: string[];
  };
}

interface MLStatsResponse {
  transactionsCount: number;
  categoriesCount: number;
  message: string;
}

interface MLTrainResponse {
  message: string;
  stats: {
    version: string;
    trainingDataSize: number;
    patternsCount: number;
    lastTrained: string;
    categoriesTracked: string[];
    transactionsCount: number;
    categoriesCount: number;
  };
  modelSize: number;
}

/**
 * Custom hook for ML-based expense categorization
 *
 * Features:
 * - Get category suggestions based on description
 * - Train/retrain the ML model
 * - Get model statistics
 * - Automatic caching and invalidation
 */
export function useMLCategorization() {
  const queryClient = useQueryClient();

  /**
   * Get category suggestions for a transaction
   */
  const getSuggestions = async (
    params: MLCategorizationParams
  ): Promise<MLCategorizationResponse> => {
    const queryParams = new URLSearchParams({
      description: params.description,
    });

    if (params.amount !== undefined) {
      queryParams.append('amount', params.amount.toString());
    }

    if (params.type) {
      queryParams.append('type', params.type);
    }

    const response = await fetch(`/api/ml/categorize?${queryParams.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener sugerencias');
    }

    return response.json();
  };

  /**
   * Train the ML model with user's transaction history
   */
  const trainModel = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al entrenar el modelo');
      }

      return response.json() as Promise<MLTrainResponse>;
    },
    onSuccess: () => {
      // Invalidate any cached suggestions
      queryClient.invalidateQueries({ queryKey: ['ml-categorization'] });
    },
  });

  /**
   * Get ML model statistics
   */
  const getStats = useQuery({
    queryKey: ['ml-stats'],
    queryFn: async (): Promise<MLStatsResponse> => {
      const response = await fetch('/api/ml/train');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener estadísticas');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Hook for real-time suggestions as user types
   * Uses React Query with enabled/disabled based on description length
   */
  const useLiveSuggestions = (
    description: string,
    amount?: number,
    type?: 'income' | 'expense',
    enabled: boolean = true
  ) => {
    return useQuery({
      queryKey: ['ml-categorization', description, amount, type],
      queryFn: () => getSuggestions({ description, amount, type }),
      enabled: enabled && description.length >= 3, // Only fetch if description has 3+ chars
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 1,
    });
  };

  return {
    getSuggestions,
    trainModel,
    getStats,
    useLiveSuggestions,
  };
}

/**
 * Separate hook for live suggestions (more convenient in forms)
 */
export function useLiveCategorySuggestions(
  description: string,
  amount?: number,
  type?: 'income' | 'expense',
  options?: {
    enabled?: boolean;
    minLength?: number;
  }
) {
  const { enabled = true, minLength = 3 } = options || {};
  const { useLiveSuggestions } = useMLCategorization();

  const shouldFetch = enabled && description.length >= minLength;

  return useLiveSuggestions(description, amount, type, shouldFetch);
}
