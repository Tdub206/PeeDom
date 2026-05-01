import { useQuery } from '@tanstack/react-query';
import { fetchBathroomNeedMetadata } from '@/api/restroom-intelligence';
import type { BathroomNeedMetadata } from '@/types';

const bathroomNeedMetadataQueryKey = (bathroomId: string | null) =>
  ['bathroom-need-metadata', bathroomId ?? 'unknown'] as const;

export function useBathroomNeedMetadata(bathroomId: string | null) {
  return useQuery<BathroomNeedMetadata | null, Error>({
    queryKey: bathroomNeedMetadataQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchBathroomNeedMetadata(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
