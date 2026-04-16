import { useQuery } from '@tanstack/react-query';
import { fetchBathroomPrediction } from '@/api/trust';

export function usePredictionBadge(bathroomId: string | null, referenceHour?: number | null) {
  return useQuery({
    queryKey: ['bathroom-prediction', bathroomId, referenceHour ?? null],
    enabled: Boolean(bathroomId),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchBathroomPrediction(bathroomId, referenceHour ?? null);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
