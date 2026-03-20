import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bathroomLiveStatusQueryKey } from '@/hooks/useBathroomLiveStatus';
import { realtimeManager } from '@/lib/realtime-manager';
import { Sentry } from '@/lib/sentry';

interface UseRealtimeCodeVotesOptions {
  bathroomId: string | null;
  codeId?: string | null;
  currentUserId?: string | null;
  onChange?: () => Promise<void> | void;
}

export function useRealtimeCodeVotes({
  bathroomId,
  codeId = null,
  currentUserId = null,
  onChange,
}: UseRealtimeCodeVotesOptions): void {
  const queryClient = useQueryClient();
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  const handleRealtimeRefresh = useCallback(() => {
    if (bathroomId) {
      void queryClient.invalidateQueries({
        queryKey: ['bathrooms'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['cleanliness-rating', bathroomId, currentUserId],
        refetchType: 'active',
      });
      void queryClient.invalidateQueries({
        queryKey: bathroomLiveStatusQueryKey(bathroomId),
        refetchType: 'active',
      });
    }

    if (codeId) {
      void queryClient.invalidateQueries({
        queryKey: ['code-vote', codeId, currentUserId],
        refetchType: 'active',
      });
    }

    if (!onChangeRef.current) {
      return;
    }

    void Promise.resolve(onChangeRef.current()).catch((error) => {
      Sentry.captureException(error);
    });
  }, [bathroomId, codeId, currentUserId, queryClient]);

  useEffect(() => {
    if (!bathroomId) {
      return;
    }

    const channelName = `bathroom-detail:${bathroomId}`;

    realtimeManager.subscribe(channelName, (channel) => {
      let configuredChannel = channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_access_codes',
            filter: `bathroom_id=eq.${bathroomId}`,
          },
          () => {
            handleRealtimeRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cleanliness_ratings',
            filter: `bathroom_id=eq.${bathroomId}`,
          },
          () => {
            handleRealtimeRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_status_events',
            filter: `bathroom_id=eq.${bathroomId}`,
          },
          () => {
            handleRealtimeRefresh();
          }
        );

      if (codeId) {
        configuredChannel = configuredChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'code_votes',
            filter: `code_id=eq.${codeId}`,
          },
          () => {
            handleRealtimeRefresh();
          }
        );
      }

      return configuredChannel;
    });

    return () => {
      void realtimeManager.unregister(channelName);
    };
  }, [bathroomId, codeId, handleRealtimeRefresh]);
}
