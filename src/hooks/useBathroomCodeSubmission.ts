import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomAccessCode } from '@/api/access-codes';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { bathroomDetailQueryKey } from '@/hooks/useBathroomDetail';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { CodeSubmit } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface SubmitCodeOptions {
  draftId?: string | null;
}

export type CodeSubmissionOutcome =
  | {
      status: 'auth_required';
    }
  | {
      status: 'completed';
      codeId: string;
    }
  | {
      status: 'queued_retry';
    };

function buildSubmitCodeReturnRoute(codeInput: CodeSubmit, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: codeInput.bathroom_id,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.submitCode}?${searchParams.toString()}`;
}

export function useBathroomCodeSubmission() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCode = useCallback(
    async (codeInput: CodeSubmit, options?: SubmitCodeOptions): Promise<CodeSubmissionOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'submit_code',
        route: buildSubmitCodeReturnRoute(codeInput, options?.draftId),
        params: {
          bathroom_id: codeInput.bathroom_id,
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
        const result = await createBathroomAccessCode(authenticatedUser.id, codeInput);

        if (result.error) {
          throw result.error;
        }

        if (!result.data?.code_id) {
          throw new Error('The code was submitted, but no code identifier was returned.');
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: bathroomDetailQueryKey(codeInput.bathroom_id),
          }),
          queryClient.invalidateQueries({
            queryKey: ['bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['search'],
          }),
        ]);

        showToast({
          title: 'Code submitted',
          message: 'Your access code is now in StallPass and will strengthen community trust as it is verified.',
          variant: 'success',
        });

        return {
          status: 'completed',
          codeId: result.data.code_id,
        };
      } catch (error) {
        if (authenticatedUser && isTransientNetworkError(error)) {
          await offlineQueue.enqueue(
            'code_submit',
            {
              bathroom_id: codeInput.bathroom_id,
              code_value: codeInput.code_value.trim(),
            },
            authenticatedUser.id
          );

          showToast({
            title: 'Code queued',
            message: 'You are offline. Your code will submit automatically when the network returns.',
            variant: 'warning',
          });

          return {
            status: 'queued_retry',
          };
        }

        showToast({
          title: 'Code submission failed',
          message: getErrorMessage(error, 'Unable to submit this bathroom code right now.'),
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
    isSubmitting,
    submitCode,
  };
}
