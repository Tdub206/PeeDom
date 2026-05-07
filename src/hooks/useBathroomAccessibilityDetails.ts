import { useQuery } from '@tanstack/react-query';
import { fetchBathroomAccessibilityDetails } from '@/api/restroom-intelligence';
import type { BathroomAccessibilityDetails } from '@/types';

const bathroomAccessibilityDetailsQueryKey = (bathroomId: string | null) =>
  ['bathroom-accessibility-details', bathroomId ?? 'unknown'] as const;

export function useBathroomAccessibilityDetails(bathroomId: string | null) {
  return useQuery<BathroomAccessibilityDetails | null, Error>({
    queryKey: bathroomAccessibilityDetailsQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchBathroomAccessibilityDetails(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
