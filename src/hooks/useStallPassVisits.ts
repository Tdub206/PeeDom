import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBusinessVisitStats,
  recordStallPassVisit,
  toggleFreeMapVisibility,
} from '@/api/stallpass-visits';
import { useAuth } from '@/contexts/AuthContext';
import { businessQueryKeys } from '@/hooks/useBusiness';
import type { BusinessVisitStats, StallPassVisitSource } from '@/types';

export const visitQueryKeys = {
  all: ['stallpass-visits'] as const,
  stats: (userId: string) => [...visitQueryKeys.all, 'stats', userId] as const,
};

export function useBusinessVisitStats(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<BusinessVisitStats[], Error>({
    queryKey: visitQueryKeys.stats(user?.id ?? 'guest'),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const result = await fetchBusinessVisitStats(user.id);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useRecordVisit() {
  return useMutation<
    { success: boolean; deduplicated: boolean },
    Error,
    { bathroomId: string; source?: StallPassVisitSource }
  >({
    mutationFn: async ({ bathroomId, source }) => {
      const result = await recordStallPassVisit(bathroomId, source);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to record visit.');
      }

      return result.data;
    },
  });
}

export function useToggleFreeMapVisibility() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { bathroomId: string; showOnFreeMap: boolean }
  >({
    mutationFn: async ({ bathroomId, showOnFreeMap }) => {
      const result = await toggleFreeMapVisibility(bathroomId, showOnFreeMap);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to update map visibility.');
      }

      return result.data;
    },
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: businessQueryKeys.dashboard(user.id),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['bathrooms'] });
    },
  });
}
