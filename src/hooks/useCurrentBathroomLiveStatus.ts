import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCurrentBathroomLiveStatus,
  reportBathroomLiveStatusEvent,
  type CurrentBathroomLiveStatus,
} from '@/api/restroom-intelligence';
import { fetchCurrentBathroomStatus, reportBathroomStatus } from '@/api/notifications';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useTrustTier } from '@/hooks/useTrustTier';
import {
  formatLiveStatusSummary,
  getLiveStatusHeadline,
  mapLegacyStatusToRichLiveStatus,
} from '@/lib/restroom-intelligence/live-status-summary';
import { pushSafely } from '@/lib/navigation';
import type {
  BathroomLiveStatusEventType,
  BathroomOccupancyLevel,
  MutationOutcome,
} from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const currentBathroomLiveStatusQueryKey = (bathroomId: string | null) =>
  ['bathroom-current-live-status', bathroomId ?? 'unknown'] as const;

interface ReportCurrentBathroomLiveStatusInput {
  statusType: BathroomLiveStatusEventType;
  statusValue: string;
  waitMinutes?: number | null;
  occupancyLevel?: BathroomOccupancyLevel | null;
  suppliesMissing?: string[];
  evidencePhotoUrl?: string | null;
}

function mapLegacyEventToRichEvent(
  bathroomId: string,
  event: {
    id: string;
    bathroom_id: string;
    status: 'clean' | 'dirty' | 'closed' | 'out_of_order' | 'long_wait';
    note: string | null;
    expires_at: string;
    created_at: string;
  }
): CurrentBathroomLiveStatus {
  const mapped = mapLegacyStatusToRichLiveStatus(event.status);
  const createdAt = new Date(event.created_at);
  const minutesSinceReport = Number.isNaN(createdAt.getTime())
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (60 * 1000)));

  return {
    id: event.id,
    bathroom_id: bathroomId,
    user_id: null,
    status_type: mapped.statusType,
    status_value: mapped.statusValue,
    wait_minutes: mapped.waitMinutes,
    occupancy_level: null,
    supplies_missing: [],
    reported_at: event.created_at,
    expires_at: event.expires_at,
    confidence_score: 0.5,
    evidence_photo_url: null,
    created_at: event.created_at,
    minutes_since_report: minutesSinceReport,
    summary_text: event.note?.trim() || `${mapped.statusValue} ${minutesSinceReport} minutes ago`,
  };
}

export function useCurrentBathroomLiveStatus(bathroomId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const { tier } = useTrustTier();

  const query = useQuery({
    queryKey: currentBathroomLiveStatusQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
    queryFn: async () => {
      if (!bathroomId) {
        return [] as CurrentBathroomLiveStatus[];
      }

      const result = await fetchCurrentBathroomLiveStatus(bathroomId);

      if (!result.error && result.data.length > 0) {
        return result.data;
      }

      const fallbackResult = await fetchCurrentBathroomStatus(bathroomId);

      if (fallbackResult.error || !fallbackResult.data) {
        if (result.error) {
          throw result.error;
        }

        return [] as CurrentBathroomLiveStatus[];
      }

      return [
        mapLegacyEventToRichEvent(bathroomId, {
          id: fallbackResult.data.id,
          bathroom_id: fallbackResult.data.bathroom_id,
          status: fallbackResult.data.status,
          note: fallbackResult.data.note,
          expires_at: fallbackResult.data.expires_at,
          created_at: fallbackResult.data.created_at,
        }),
      ];
    },
  });

  const reportCurrentStatus = useCallback(
    async (
      input: ReportCurrentBathroomLiveStatusInput
    ): Promise<MutationOutcome> => {
      if (!bathroomId) {
        throw new Error('A bathroom identifier is required before reporting status.');
      }

      const authenticatedUser = requireAuth({
        type: 'report_live_status',
        route: `${routes.modal.liveStatus}?bathroom_id=${encodeURIComponent(bathroomId)}`,
        params: {
          bathroom_id: bathroomId,
        },
        replay_strategy: 'draft_resume',
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      try {
        const trustWeight = Math.max(0, Math.min(1, tier.trust_score / 100));
        const confidenceScore = Number((0.4 + trustWeight * 0.4).toFixed(4));
        const reportResult = await reportBathroomLiveStatusEvent({
          bathroomId,
          statusType: input.statusType,
          statusValue: input.statusValue,
          waitMinutes: input.waitMinutes ?? null,
          occupancyLevel: input.occupancyLevel ?? null,
          suppliesMissing: input.suppliesMissing ?? [],
          evidencePhotoUrl: input.evidencePhotoUrl ?? null,
          confidenceScore,
        });

        if (reportResult.error) {
          throw reportResult.error;
        }

        // Mirror the subset of statuses supported by the legacy status pipeline.
        if (input.statusType === 'cleanliness' && (input.statusValue === 'clean' || input.statusValue === 'dirty')) {
          await reportBathroomStatus({
            bathroomId,
            status: input.statusValue,
            note: null,
          });
        } else if (input.statusType === 'closed') {
          await reportBathroomStatus({
            bathroomId,
            status: 'closed',
            note: null,
          });
        } else if (input.statusType === 'access' && input.statusValue === 'out_of_order') {
          await reportBathroomStatus({
            bathroomId,
            status: 'out_of_order',
            note: null,
          });
        } else if (input.statusType === 'line') {
          await reportBathroomStatus({
            bathroomId,
            status: 'long_wait',
            note: typeof input.waitMinutes === 'number' ? `Estimated wait ${input.waitMinutes} minutes.` : null,
          });
        }

        await queryClient.invalidateQueries({
          queryKey: currentBathroomLiveStatusQueryKey(bathroomId),
        });

        showToast({
          title: 'Live status shared',
          message: 'Thanks for keeping this bathroom status fresh.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        showToast({
          title: 'Live status not saved',
          message: getErrorMessage(error, 'Unable to save this live status update right now.'),
          variant: 'error',
        });
        throw error;
      }
    },
    [bathroomId, queryClient, requireAuth, router, showToast, tier.trust_score]
  );

  return {
    events: query.data ?? [],
    headline: getLiveStatusHeadline(query.data ?? []),
    summaries: (query.data ?? []).map((event) => ({
      ...event,
      summaryText: formatLiveStatusSummary(event),
    })),
    isLoadingCurrentLiveStatus: query.isLoading,
    isRefreshingCurrentLiveStatus: query.isFetching,
    currentLiveStatusError: query.error instanceof Error ? query.error : null,
    reportCurrentStatus,
  };
}
