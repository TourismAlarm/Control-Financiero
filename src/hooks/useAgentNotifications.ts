import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook para gestionar notificaciones de agentes inteligentes
 */

export interface AgentNotification {
  id: string;
  user_id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at?: string | null;
  dismissed_at?: string | null;
}

const QUERY_KEY = 'agent_notifications';

export function useAgentNotifications() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('agent_notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AgentNotification[];
    },
    enabled: !!session?.user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!session?.user?.id) throw new Error('No session');

      const { error } = await (supabase as any)
        .from('agent_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Mark notification as dismissed
  const dismissNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!session?.user?.id) throw new Error('No session');

      const { error } = await (supabase as any)
        .from('agent_notifications')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('No session');

      const { error } = await (supabase as any)
        .from('agent_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Dismiss all notifications
  const dismissAll = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('No session');

      const { error } = await (supabase as any)
        .from('agent_notifications')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .eq('is_dismissed', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Get counts
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.is_read).length;

  return {
    // Data
    notifications,
    isLoading,
    error,
    unreadCount,
    highPriorityCount,

    // Mutations
    markAsRead: markAsRead.mutate,
    dismissNotification: dismissNotification.mutate,
    markAllAsRead: markAllAsRead.mutate,
    dismissAll: dismissAll.mutate,

    // States
    isMarkingAsRead: markAsRead.isPending,
    isDismissing: dismissNotification.isPending,

    // Helpers
    refetch,
  };
}
