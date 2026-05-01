import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomAttributeConfirmations } from '@/api/restroom-intelligence';
import { buildBathroomTrustSummary } from '@/lib/restroom-intelligence/trust-summary';
import type {
  BathroomAttributeConfirmation,
  BathroomAttributeConfirmationSourceType,
  BathroomTrustSummary,
} from '@/types';

const trustSummaryQueryKey = (bathroomId: string | null) =>
  ['bathroom-trust-summary', bathroomId ?? 'unknown'] as const;

function buildFallbackConfirmation(options: {
  bathroomId: string;
  confidenceScore?: number | null;
  lastConfirmedAt?: string | null;
}): BathroomAttributeConfirmation[] {
  if (!options.lastConfirmedAt || typeof options.confidenceScore !== 'number') {
    return [];
  }

  return [
    {
      id: `${options.bathroomId}-fallback-trust`,
      bathroom_id: options.bathroomId,
      field_name: 'access_code_confidence',
      field_value_snapshot: {
        confidence_score: options.confidenceScore,
      },
      source_type: 'user_report' as BathroomAttributeConfirmationSourceType,
      source_user_id: null,
      business_id: null,
      confidence_score: Math.max(0, Math.min(1, options.confidenceScore / 100)),
      last_confirmed_at: options.lastConfirmedAt,
      evidence_photo_url: null,
      notes: null,
      created_at: options.lastConfirmedAt,
      updated_at: options.lastConfirmedAt,
    },
  ];
}

export function useBathroomTrustSummary(options: {
  bathroomId: string | null;
  fallbackConfidenceScore?: number | null;
  fallbackLastConfirmedAt?: string | null;
}) {
  const query = useQuery({
    queryKey: trustSummaryQueryKey(options.bathroomId),
    enabled: Boolean(options.bathroomId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!options.bathroomId) {
        return [] as BathroomAttributeConfirmation[];
      }

      const result = await fetchBathroomAttributeConfirmations(options.bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const summary = useMemo<BathroomTrustSummary>(() => {
    const fallbackConfirmations =
      options.bathroomId
        ? buildFallbackConfirmation({
            bathroomId: options.bathroomId,
            confidenceScore: options.fallbackConfidenceScore,
            lastConfirmedAt: options.fallbackLastConfirmedAt,
          })
        : [];

    const confirmations =
      (query.data && query.data.length > 0 ? query.data : fallbackConfirmations) ?? [];

    return buildBathroomTrustSummary(confirmations);
  }, [
    options.bathroomId,
    options.fallbackConfidenceScore,
    options.fallbackLastConfirmedAt,
    query.data,
  ]);

  return {
    summary,
    confirmations: query.data ?? [],
    isLoadingSummary: query.isLoading,
    isRefreshingSummary: query.isFetching,
    summaryError: query.error instanceof Error ? query.error : null,
    refetchSummary: query.refetch,
  };
}
