import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserCodeVote, upsertCodeVote } from '@/api/access-codes';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

export type CodeVerificationOutcome = 'auth_required' | 'completed' | 'failed' | 'queued_retry';

interface UseBathroomCodeVerificationOptions {
  bathroomId: string;
  codeId: string | null;
  onVoteRecorded?: () => Promise<void> | void;
}

export function useBathroomCodeVerification({
  bathroomId,
  codeId,
  onVoteRecorded,
}: UseBathroomCodeVerificationOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const currentVoteQuery = useQuery({
    queryKey: ['code-vote', codeId, user?.id ?? null],
    enabled: Boolean(codeId && user?.id),
    queryFn: async () => {
      if (!codeId || !user?.id) {
        return null;
      }

      const result = await fetchUserCodeVote(user.id, codeId);

      if (result.error) {
        throw result.error;
      }

      return result.data?.vote ?? null;
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (vote: -1 | 1): Promise<CodeVerificationOutcome> => {
      if (!codeId) {
        throw new Error('No bathroom access code is available to verify.');
      }

      const returnRoute = `/bathroom/${bathroomId}`;

      const authenticatedUser = requireAuth({
        type: 'vote_code',
        route: returnRoute,
        params: {
          bathroom_id: bathroomId,
          code_id: codeId,
          vote,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      try {
        const result = await upsertCodeVote(authenticatedUser.id, codeId, vote);

        if (result.error) {
          throw result.error;
        }

        await queryClient.invalidateQueries({
          queryKey: ['code-vote', codeId, authenticatedUser.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        });
        await onVoteRecorded?.();

        showToast({
          title: vote === 1 ? 'Verification recorded' : 'Code flagged',
          message:
            vote === 1
              ? 'Thanks for confirming the code worked. The trust signal has been updated.'
              : 'Thanks for flagging this code. Please add report details if you can.',
          variant: vote === 1 ? 'success' : 'warning',
        });

        return 'completed';
      } catch (error) {
        if (authenticatedUser && isTransientNetworkError(error)) {
          await offlineQueue.enqueue(
            'code_vote',
            {
              code_id: codeId,
              vote,
            },
            authenticatedUser.id
          );

          showToast({
            title: 'Verification queued',
            message: 'You are offline. Your vote will sync when your connection returns.',
            variant: 'warning',
          });

          return 'queued_retry';
        }

        showToast({
          title: 'Verification failed',
          message: getErrorMessage(error, 'We could not save your verification right now.'),
          variant: 'error',
        });

        return 'failed';
      }
    },
  });

  const submitVerificationVote = useCallback(
    async (vote: -1 | 1): Promise<CodeVerificationOutcome> => {
      return voteMutation.mutateAsync(vote);
    },
    [voteMutation]
  );

  return {
    currentVote: currentVoteQuery.data ?? null,
    isLoadingCurrentVote: currentVoteQuery.isLoading,
    isSubmittingVote: voteMutation.isPending,
    submitVerificationVote,
  };
}
