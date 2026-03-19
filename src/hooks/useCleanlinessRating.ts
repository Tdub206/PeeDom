import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserCleanlinessRating, upsertCleanlinessRating } from '@/api/cleanliness-ratings';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { CleanlinessRating, CleanlinessRatingCreate, MutationOutcome } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface SubmitCleanlinessRatingOptions {
  draftId?: string | null;
}

export const cleanlinessRatingQueryKey = (bathroomId: string, userId?: string | null) =>
  ['cleanliness-rating', bathroomId, userId ?? 'guest'] as const;

function buildRateCleanlinessReturnRoute(
  ratingInput: CleanlinessRatingCreate,
  draftId?: string | null
): string {
  const searchParams = new URLSearchParams({
    bathroom_id: ratingInput.bathroom_id,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.rateCleanliness}?${searchParams.toString()}`;
}

export function useCleanlinessRating(bathroomId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRatingQuery = useQuery({
    queryKey: cleanlinessRatingQueryKey(bathroomId ?? '', user?.id),
    enabled: Boolean(bathroomId && user?.id),
    queryFn: async (): Promise<CleanlinessRating | null> => {
      if (!bathroomId || !user?.id) {
        return null;
      }

      const result = await fetchUserCleanlinessRating(user.id, bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    staleTime: 60_000,
  });

  const submitRating = useCallback(
    async (
      ratingInput: CleanlinessRatingCreate,
      options?: SubmitCleanlinessRatingOptions
    ): Promise<MutationOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'rate_cleanliness',
        route: buildRateCleanlinessReturnRoute(ratingInput, options?.draftId),
        params: {
          bathroom_id: ratingInput.bathroom_id,
          draft_id: options?.draftId ?? null,
        },
        replay_strategy: 'draft_resume',
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsSubmitting(true);

      try {
        const result = await upsertCleanlinessRating(authenticatedUser.id, ratingInput);

        if (result.error) {
          throw result.error;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: cleanlinessRatingQueryKey(ratingInput.bathroom_id, authenticatedUser.id),
          }),
          queryClient.invalidateQueries({
            queryKey: ['bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['search'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['favorites', authenticatedUser.id],
          }),
        ]);

        showToast({
          title: 'Rating saved',
          message: 'Thanks for sharing how clean this bathroom was.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        if (isTransientNetworkError(error)) {
          await offlineQueue.enqueue(
            'rating_create',
            {
              bathroom_id: ratingInput.bathroom_id,
              rating: ratingInput.rating,
              notes: ratingInput.notes?.trim() || null,
            },
            authenticatedUser.id
          );

          showToast({
            title: 'Rating queued',
            message: 'You are offline. Your cleanliness rating will sync automatically when the network returns.',
            variant: 'warning',
          });

          return 'queued_retry';
        }

        showToast({
          title: 'Rating failed',
          message: getErrorMessage(error, 'Unable to save your cleanliness rating right now.'),
          variant: 'error',
        });
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [queryClient, requireAuth, router, showToast]
  );

  return {
    currentRating: currentRatingQuery.data ?? null,
    isLoadingCurrentRating: currentRatingQuery.isLoading,
    isRefreshingCurrentRating: currentRatingQuery.isFetching,
    isSubmitting,
    submitRating,
  };
}
