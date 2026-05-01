import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentBathroomStatus, reportBathroomStatus } from '@/api/notifications';
import { reportBathroomLiveStatusEvent } from '@/api/restroom-intelligence';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { realtimeManager } from '@/lib/realtime-manager';
import { Sentry } from '@/lib/sentry';
import type { BathroomLiveStatus, LiveStatusReportCreate, MutationOutcome } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';
import { mapLegacyStatusToRichLiveStatus } from '@/lib/restroom-intelligence/live-status-summary';

interface SubmitBathroomLiveStatusOptions {
  draftId?: string | null;
}

export const bathroomLiveStatusQueryKey = (bathroomId: string | null) =>
  ['bathroom-live-status', bathroomId ?? 'unknown'] as const;

function buildLiveStatusReturnRoute(
  input: LiveStatusReportCreate,
  draftId?: string | null
): string {
  const searchParams = new URLSearchParams({
    bathroom_id: input.bathroom_id,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.liveStatus}?${searchParams.toString()}`;
}

export function useBathroomLiveStatus(bathroomId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isReportingStatus, setIsReportingStatus] = useState(false);

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

  useEffect(() => {
    if (!bathroomId) {
      return;
    }

    const channelName = `bathroom-status:${bathroomId}`;

    realtimeManager.subscribe(
      channelName,
      (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_status_events',
            filter: `bathroom_id=eq.${bathroomId}`,
          },
          () => {
            void queryClient
              .invalidateQueries({
                queryKey: bathroomLiveStatusQueryKey(bathroomId),
              })
              .catch((error) => {
                Sentry.captureException(error);
              });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_live_status_events',
            filter: `bathroom_id=eq.${bathroomId}`,
          },
          () => {
            void queryClient
              .invalidateQueries({
                queryKey: bathroomLiveStatusQueryKey(bathroomId),
              })
              .catch((error) => {
                Sentry.captureException(error);
              });
          }
        ),
      (status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          Sentry.captureException(
            new Error(`Realtime bathroom status subscription failed for bathroom ${bathroomId}.`)
          );
        }
      }
    );

    return () => {
      void realtimeManager.unregister(channelName);
    };
  }, [bathroomId, queryClient]);

  const reportStatus = useCallback(
    async (
      status: BathroomLiveStatus,
      note?: string | null,
      options?: SubmitBathroomLiveStatusOptions
    ): Promise<MutationOutcome> => {
      if (!bathroomId) {
        throw new Error('A bathroom identifier is required before reporting live status.');
      }

      const input: LiveStatusReportCreate = {
        bathroom_id: bathroomId,
        status,
        note: note?.trim() || undefined,
      };

      const authenticatedUser = requireAuth({
        type: 'report_live_status',
        route: buildLiveStatusReturnRoute(input, options?.draftId),
        params: {
          bathroom_id: bathroomId,
          draft_id: options?.draftId ?? null,
        },
        replay_strategy: 'draft_resume',
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsReportingStatus(true);

      try {
        const result = await reportBathroomStatus({
          bathroomId,
          status,
          note: input.note ?? null,
        });

        if (result.error) {
          throw result.error;
        }

        const mappedLiveStatus = mapLegacyStatusToRichLiveStatus(status);
        const richStatusResult = await reportBathroomLiveStatusEvent({
          bathroomId,
          statusType: mappedLiveStatus.statusType,
          statusValue: mappedLiveStatus.statusValue,
          waitMinutes: mappedLiveStatus.waitMinutes,
        });

        if (richStatusResult.error) {
          Sentry.captureException(richStatusResult.error);
        }

        await queryClient.invalidateQueries({
          queryKey: bathroomLiveStatusQueryKey(bathroomId),
        });

        showToast({
          title: 'Status reported',
          message: 'Thanks for sharing a live update for this bathroom.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        const errorWithCode = error as Error & { code?: string };
        const isRateLimited =
          typeof errorWithCode.code === 'string' && errorWithCode.code.toLowerCase() === 'rate_limited';

        if (!isRateLimited && isTransientNetworkError(error)) {
          await offlineQueue.enqueue(
            'status_report',
            {
              bathroom_id: bathroomId,
              status,
              note: input.note ?? null,
            },
            authenticatedUser.id
          );

          showToast({
            title: 'Status queued',
            message: 'You are offline. Your live status update will sync automatically when the network returns.',
            variant: 'warning',
          });

          return 'queued_retry';
        }

        showToast({
          title: isRateLimited ? 'Status recently reported' : 'Status update failed',
          message: isRateLimited
            ? 'You can report this bathroom again after the current cooldown ends.'
            : getErrorMessage(error, 'We could not save that live status right now.'),
          variant: isRateLimited ? 'warning' : 'error',
        });
        throw error;
      } finally {
        setIsReportingStatus(false);
      }
    },
    [bathroomId, queryClient, requireAuth, router, showToast]
  );

  return {
    currentStatus: currentStatusQuery.data ?? null,
    isLoadingCurrentStatus: currentStatusQuery.isLoading,
    isRefreshingCurrentStatus: currentStatusQuery.isFetching,
    isReportingStatus,
    reportStatus,
  };
}
