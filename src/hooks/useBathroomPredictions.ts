/**
 * Heuristic prediction hook (Guide Section 5). Fetches
 * `get_bathroom_predictions` and emits a `prediction_shown` event on each
 * successful read so accuracy can be tracked against `user_override` /
 * `prediction_correct` events.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomPredictions } from '@/api/access-intelligence';
import { useEventEmitter } from '@/hooks/useEventEmitter';
import type { BathroomPrediction } from '@/types/access-intelligence';

export const bathroomPredictionQueryKey = (bathroomId: string | null | undefined) =>
  ['access-intelligence', 'predictions', bathroomId ?? null] as const;

const DEFAULT_PREDICTION: BathroomPrediction = {
  bathroom_id: '',
  likely_accessible: false,
  confidence: 0,
  busy_level: 'low',
  best_time: null,
  model_version: 'heuristic-v1',
};

export interface UseBathroomPredictionsResult {
  prediction: BathroomPrediction | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBathroomPredictions(
  bathroomId: string | null | undefined
): UseBathroomPredictionsResult {
  const { emit } = useEventEmitter();
  const query = useQuery({
    queryKey: bathroomPredictionQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: 120_000,
    queryFn: async () => {
      if (!bathroomId) return DEFAULT_PREDICTION;
      const result = await fetchBathroomPredictions(bathroomId);
      if (result.error) {
        throw result.error;
      }
      return result.data ?? DEFAULT_PREDICTION;
    },
  });

  useEffect(() => {
    if (!bathroomId || !query.data) return;
    emit({
      eventType: 'prediction_shown',
      bathroomId,
      payload: {
        likely_accessible: query.data.likely_accessible,
        confidence: query.data.confidence,
        busy_level: query.data.busy_level,
        model_version: query.data.model_version,
      },
    });
  }, [bathroomId, query.data, emit]);

  return {
    prediction: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
