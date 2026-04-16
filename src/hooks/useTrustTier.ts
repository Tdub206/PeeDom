import { useQuery } from '@tanstack/react-query';
import { fetchUserTrustTier } from '@/api/trust';
import { useAuth } from '@/contexts/AuthContext';

export function useTrustTier(userId?: string | null) {
  const { user } = useAuth();
  const resolvedUserId = userId ?? user?.id ?? null;

  return useQuery({
    queryKey: ['trust-tier', resolvedUserId],
    enabled: Boolean(resolvedUserId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const result = await fetchUserTrustTier(resolvedUserId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
