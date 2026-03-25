import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBusinessClaims } from '@/api/business-claims';
import { fetchBathroomsByIds } from '@/api/bathrooms';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessClaimListItem } from '@/types';
import { hydrateBusinessClaimListItem, summarizeBusinessClaims } from '@/utils/business-claims';

export function useBusinessClaims() {
  const { user } = useAuth();
  const queryKey = useMemo(() => ['business-claims', user?.id ?? 'guest'], [user?.id]);

  const businessClaimsQuery = useQuery<BusinessClaimListItem[], Error>({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const claimsResult = await fetchBusinessClaims(user.id);

      if (claimsResult.error) {
        throw claimsResult.error;
      }

      const bathroomIds = [...new Set(claimsResult.data.map((claim) => claim.bathroom_id))];

      if (!bathroomIds.length) {
        return [];
      }

      const bathroomsResult = await fetchBathroomsByIds({
        bathroomIds,
      });

      if (bathroomsResult.error) {
        throw bathroomsResult.error;
      }

      const bathroomLookup = new Map(
        bathroomsResult.data.map((bathroom) => [bathroom.id, bathroom] as const)
      );

      return claimsResult.data.map((claim) =>
        hydrateBusinessClaimListItem(claim, bathroomLookup.get(claim.bathroom_id) ?? null)
      );
    },
  });

  const counts = useMemo(
    () => summarizeBusinessClaims(businessClaimsQuery.data ?? []),
    [businessClaimsQuery.data]
  );

  return {
    claims: businessClaimsQuery.data ?? [],
    counts,
    isLoading: businessClaimsQuery.isLoading,
    isFetching: businessClaimsQuery.isFetching,
    error: businessClaimsQuery.error,
    refetch: businessClaimsQuery.refetch,
    queryKey,
  };
}
