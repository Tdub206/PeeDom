import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEarlyAdopterInvites,
  generateEarlyAdopterInvite,
  redeemEarlyAdopterInvite,
} from '@/api/early-adopter';
import { useAuth } from '@/contexts/AuthContext';
import type {
  EarlyAdopterInvite,
  GenerateInviteInput,
  GenerateInviteResult,
  RedeemInviteResult,
} from '@/types';

export const inviteQueryKeys = {
  all: ['early-adopter-invites'] as const,
  list: (statusFilter?: string) => [...inviteQueryKeys.all, 'list', statusFilter ?? 'all'] as const,
};

export function useEarlyAdopterInvites(statusFilter?: string, options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<EarlyAdopterInvite[], Error>({
    queryKey: inviteQueryKeys.list(statusFilter),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const result = await fetchEarlyAdopterInvites(statusFilter);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useGenerateInvite() {
  const queryClient = useQueryClient();

  return useMutation<GenerateInviteResult, Error, GenerateInviteInput>({
    mutationFn: async (input) => {
      const result = await generateEarlyAdopterInvite(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to generate invite right now.');
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteQueryKeys.all });
    },
  });
}

export function useRedeemInvite() {
  const queryClient = useQueryClient();

  return useMutation<RedeemInviteResult, Error, string>({
    mutationFn: async (inviteToken) => {
      const result = await redeemEarlyAdopterInvite(inviteToken);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to redeem invite code.');
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteQueryKeys.all });
    },
  });
}
