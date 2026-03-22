import { useQuery } from '@tanstack/react-query';
import { fetchBathroomDetailById, type PublicBathroomDetailRow } from '@/api/bathrooms';

export const bathroomDetailQueryKey = (bathroomId: string | null) =>
  ['bathroom-detail', bathroomId ?? 'unknown'] as const;

export function useBathroomDetail(bathroomId: string | null) {
  return useQuery<PublicBathroomDetailRow | null, Error>({
    queryKey: bathroomDetailQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchBathroomDetailById(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
