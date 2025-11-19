import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import { profileSchema, type Profile, type ProfileUpdate } from '@/lib/validations/schemas';

/**
 * Custom hook for managing user profile with TanStack Query
 */

const QUERY_KEY = 'profile';

export function useProfile() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch profile query
  const {
    data: profile,
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
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      return profileSchema.parse(data);
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<ProfileUpdate>) => {
      if (!session?.user?.id) {
        throw new Error('No user session');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return profileSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Get financial month start day (default to 1 if not set)
  const getFinancialMonthStartDay = (): number => {
    return profile?.financial_month_start_day ?? 1;
  };

  return {
    // Data
    profile,
    isLoading,
    error,

    // Mutations
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,

    // Mutation states
    isUpdating: updateProfile.isPending,

    // Helpers
    refetch,
    getFinancialMonthStartDay,
  };
}
