import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentBathroomStatus, reportBathroomStatus } from '@/api/notifications';
import { useToast } from '@/hooks/useToast';
import { getSupabaseClient } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';
import type { BathroomLiveStatus } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export const bathroomLiveStatusQueryKey = (bathroomId: string | null) =>
  ['bathroom-live-status', bathroomId ?? 'unknown'] as const;

export function useBathroomLiveStatus(bathroomId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const currentStatusQuery = useQuery({
    queryKey: bathroomLiveStatusQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchCurrentBathroomStatus(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const reportMutation = useMutation({
    mutationFn: async (input: { status: BathroomLiveStatus; note?: string | null }) => {
      if (!bathroomId) {
        throw new Error('A bathroom identifier is required before reporting live status.');
      }

      const result = await reportBathroomStatus({
        bathroomId,
        status: input.status,
        note: input.note ?? null,
      });

      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: bathroomLiveStatusQueryKey(bathroomId),
      });

      showToast({
        title: 'Status reported',
        message: 'Thanks for sharing a live update for this bathroom.',
        variant: 'success',
      });
    },
    onError: (error: Error & { code?: string }) => {
      const isRateLimited = typeof error.code === 'string' && error.code.toLowerCase() === 'rate_limited';

      showToast({
        title: isRateLimited ? 'Status recently reported' : 'Status update failed',
        message: isRateLimited
          ? 'You can report this bathroom again after the current cooldown ends.'
          : getErrorMessage(error, 'We could not save that live status right now.'),
        variant: isRateLimited ? 'warning' : 'error',
      });
    },
  });

  useEffect(() => {
    if (!bathroomId) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`bathroom-status:${bathroomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bathroom_status_events',
          filter: `bathroom_id=eq.${bathroomId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: bathroomLiveStatusQueryKey(bathroomId),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          Sentry.captureException(new Error(`Realtime bathroom status subscription failed for bathroom ${bathroomId}.`));
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [bathroomId, queryClient]);

  const reportStatus = useCallback(
    async (status: BathroomLiveStatus, note?: string | null) => {
      try {
        await reportMutation.mutateAsync({
          status,
          note: note ?? null,
        });
        return true;
      } catch {
        return false;
      }
    },
    [reportMutation]
  );

  return {
    currentStatus: currentStatusQuery.data ?? null,
    isLoadingCurrentStatus: currentStatusQuery.isLoading,
    isRefreshingCurrentStatus: currentStatusQuery.isFetching,
    isReportingStatus: reportMutation.isPending,
    reportStatus,
  };
}
