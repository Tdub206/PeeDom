import { useQuery } from '@tanstack/react-query';
import { fetchBathroomDetailById, type PublicBathroomDetailRow } from '@/api/bathrooms';

export const BATHROOM_DETAIL_STALE_TIME_MS = 60_000;
export const BATHROOM_DETAIL_FOCUS_REFRESH_THRESHOLD_MS = BATHROOM_DETAIL_STALE_TIME_MS;

export const bathroomDetailQueryKey = (bathroomId: string | null) =>
  ['bathroom-detail', bathroomId ?? 'unknown'] as const;

export function shouldRefreshBathroomDetailOnFocus(
  bathroomDetail: PublicBathroomDetailRow | null | undefined,
  dataUpdatedAt: number,
  now = Date.now()
): boolean {
  if (!bathroomDetail) {
    return true;
  }

  if (!dataUpdatedAt) {
    return true;
  }

  return now - dataUpdatedAt >= BATHROOM_DETAIL_FOCUS_REFRESH_THRESHOLD_MS;
}

export function useBathroomDetail(bathroomId: string | null) {
  return useQuery<PublicBathroomDetailRow | null, Error>({
    queryKey: bathroomDetailQueryKey(bathroomId),
    enabled: Boolean(bathroomId),
    staleTime: BATHROOM_DETAIL_STALE_TIME_MS,
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
