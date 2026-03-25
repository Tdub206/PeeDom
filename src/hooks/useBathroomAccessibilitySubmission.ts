import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { submitBathroomAccessibilityUpdate } from '@/api/accessibility';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import type { BathroomAccessibilityUpdateInput, MutationOutcome } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface SubmitBathroomAccessibilityOptions {
  draftId?: string | null;
}

function buildUpdateAccessibilityReturnRoute(
  input: BathroomAccessibilityUpdateInput,
  draftId?: string | null
): string {
  const searchParams = new URLSearchParams({
    bathroom_id: input.bathroom_id,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.updateAccessibility}?${searchParams.toString()}`;
}

export function useBathroomAccessibilitySubmission() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAccessibility = useCallback(
    async (
      input: BathroomAccessibilityUpdateInput,
      options?: SubmitBathroomAccessibilityOptions
    ): Promise<MutationOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'update_accessibility',
        route: buildUpdateAccessibilityReturnRoute(input, options?.draftId),
        params: {
          bathroom_id: input.bathroom_id,
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
        const result = await submitBathroomAccessibilityUpdate(input);

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
          queryClient.invalidateQueries({
            queryKey: ['accessibility'],
          }),
        ]);

        showToast({
          title: 'Accessibility updated',
          message: 'Thanks for adding structured accessibility details for this bathroom.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        if (isTransientNetworkError(error)) {
          await offlineQueue.enqueue('accessibility_update', input, authenticatedUser.id);

          showToast({
            title: 'Accessibility update queued',
            message: 'You are offline. The accessibility details will sync automatically when the network returns.',
            variant: 'warning',
          });

          return 'queued_retry';
        }

        showToast({
          title: 'Accessibility update failed',
          message: getErrorMessage(error, 'Unable to save accessibility details for this bathroom right now.'),
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
    submitAccessibility,
  };
}
