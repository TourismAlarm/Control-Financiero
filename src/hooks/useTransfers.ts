import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  transferSchema,
  type Transfer,
  type TransferInsert,
} from '@/lib/validations/schemas';

/**
 * Custom hook for managing transfers between accounts using API routes
 * All operations go through /api/transfers with NextAuth session validation
 */

const QUERY_KEY = 'transfers';

interface UseTransfersOptions {
  month?: number;
  year?: number;
}

export function useTransfers(options?: UseTransfersOptions) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Build query params
  const queryParams = new URLSearchParams();
  if (options?.month) queryParams.set('month', options.month.toString());
  if (options?.year) queryParams.set('year', options.year.toString());
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  // Fetch transfers query
  const {
    data: transfers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id, options?.month, options?.year],
    queryFn: async () => {
      const res = await fetch(`/api/transfers${queryString}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch transfers');
      }

      const data = await res.json();
      return data.map((item: any) => transferSchema.parse(item));
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create transfer mutation
  const {
    mutate: createTransfer,
    mutateAsync: createTransferAsync,
    isPending: isCreating,
  } = useMutation({
    mutationFn: async (transfer: TransferInsert) => {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transfer),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create transfer');
      }

      const data = await res.json();
      return transferSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Delete transfer mutation
  const {
    mutate: deleteTransfer,
    mutateAsync: deleteTransferAsync,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await fetch(`/api/transfers?id=${transferId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete transfer');
      }

      return transferId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });

  // Helper functions
  const getTotalTransferred = () => {
    const total = transfers.reduce((sum: number, transfer: Transfer) => {
      return sum + Number(transfer.amount);
    }, 0);

    return total;
  };

  const getTransfersByAccount = (accountId: string) => {
    return {
      outgoing: transfers.filter((t: Transfer) => t.from_account_id === accountId),
      incoming: transfers.filter((t: Transfer) => t.to_account_id === accountId),
    };
  };

  return {
    // Data
    transfers,
    isLoading,
    error,

    // Mutations
    createTransfer,
    createTransferAsync,
    deleteTransfer,
    deleteTransferAsync,

    // Loading states
    isCreating,
    isDeleting,

    // Helpers
    getTotalTransferred,
    getTransfersByAccount,
    refetch,
  };
}
