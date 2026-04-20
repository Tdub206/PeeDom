/**
 * Reads the user's trust tier config from Supabase RPC `get_user_trust_tier`.
 * Caches via TanStack Query; invalidates on auth state change.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchUserTrustTier } from '@/api/access-intelligence';
import { useAuth } from '@/contexts/AuthContext';
import type { UserTrustTier } from '@/types/access-intelligence';

export const trustTierQueryKey = (userId: string | null | undefined) =>
  ['access-intelligence', 'trust-tier', userId ?? null] as const;

const NEWCOMER_FALLBACK: UserTrustTier = {
  user_id: '',
  tier: 'brand_new',
  bucket: 'newcomer',
  trust_weight: 1,
  trust_score: 25,
  shadow_banned: false,
  codeRevealDelayMs: 5000,
  showVerificationPrompts: true,
  canSubmitCodes: true,
  showTrustedBadge: false,
  verificationPromptsFrequency: 'always',
};

export interface UseTrustTierResult {
  tier: UserTrustTier;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTrustTier(): UseTrustTierResult {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: trustTierQueryKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchUserTrustTier();
      if (result.error) {
        throw result.error;
      }
      return result.data ?? NEWCOMER_FALLBACK;
    },
  });

  return {
    tier: query.data ?? NEWCOMER_FALLBACK,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
