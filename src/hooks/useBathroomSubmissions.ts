import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomSubmission } from '@/api/bathroom-submissions';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import { BathroomCreateInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface SubmitBathroomOptions {
  draftId?: string | null;
}

export type BathroomSubmissionOutcome =
  | {
      status: 'auth_required';
    }
  | {
      status: 'completed';
      bathroomId: string;
      photoWarning: string | null;
    };

export function useBathroomSubmissions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitBathroom = useCallback(
    async (
      bathroomInput: BathroomCreateInput,
      options?: SubmitBathroomOptions
    ): Promise<BathroomSubmissionOutcome> => {
      const returnRoute = options?.draftId
        ? `${routes.modal.addBathroom}?draft_id=${encodeURIComponent(options.draftId)}`
        : '/modal/add-bathroom';
      const authenticatedUser = requireAuth({
        type: 'add_bathroom',
        route: returnRoute,
        params: {
          draft_id: options?.draftId ?? null,
        },
        replay_strategy: 'draft_resume',
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return {
          status: 'auth_required',
        };
      }

      setIsSubmitting(true);

      try {
        const result = await createBathroomSubmission(authenticatedUser.id, bathroomInput);

        if (result.error) {
          throw result.error;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['search'],
          }),
        ]);

        const photoWarning = result.warning ? getErrorMessage(result.warning, 'The photo could not be uploaded.') : null;
        const bathroomId = result.data?.bathroom_id;

        if (!bathroomId) {
          throw new Error('The bathroom was created, but no bathroom identifier was returned.');
        }

        showToast({
          title: photoWarning ? 'Bathroom added with a photo warning' : 'Bathroom added',
          message: photoWarning ?? 'The new bathroom is now available in StallPass.',
          variant: photoWarning ? 'warning' : 'success',
        });

        return {
          status: 'completed',
          bathroomId,
          photoWarning,
        };
      } catch (error) {
        const message = getErrorMessage(
          error,
          isTransientNetworkError(error)
            ? 'We could not reach Supabase. Save your draft and try again when you are back online.'
            : 'Unable to add this bathroom right now.'
        );

        showToast({
          title: isTransientNetworkError(error) ? 'Connection required' : 'Submission failed',
          message,
          variant: isTransientNetworkError(error) ? 'warning' : 'error',
        });

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [queryClient, requireAuth, router, showToast]
  );

  return {
    isSubmitting,
    submitBathroom,
  };
}
