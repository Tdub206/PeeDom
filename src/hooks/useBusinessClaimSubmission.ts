import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createBusinessClaim } from '@/api/business-claims';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import { BusinessClaimCreate } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

interface SubmitBusinessClaimOptions {
  draftId?: string | null;
}

export type BusinessClaimSubmissionOutcome =
  | {
      status: 'auth_required';
    }
  | {
      status: 'completed';
      claimId: string;
    };

function buildClaimReturnRoute(claimInput: BusinessClaimCreate, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: claimInput.bathroom_id,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.claimBusiness}?${searchParams.toString()}`;
}

export function useBusinessClaimSubmission() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitClaim = useCallback(
    async (
      claimInput: BusinessClaimCreate,
      options?: SubmitBusinessClaimOptions
    ): Promise<BusinessClaimSubmissionOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'claim_business',
        route: buildClaimReturnRoute(claimInput, options?.draftId),
        params: {
          bathroom_id: claimInput.bathroom_id,
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
        const result = await createBusinessClaim(authenticatedUser.id, claimInput);

        if (result.error) {
          throw result.error;
        }

        if (!result.data?.id) {
          throw new Error('The claim was saved, but no claim identifier was returned.');
        }

        await queryClient.invalidateQueries({
          queryKey: ['business-claims', authenticatedUser.id],
        });

        showToast({
          title: 'Claim submitted',
          message: 'Your ownership claim is in review. We will update your business portal once it changes.',
          variant: 'success',
        });

        return {
          status: 'completed',
          claimId: result.data.id,
        };
      } catch (error) {
        showToast({
          title: 'Claim failed',
          message: getErrorMessage(error, 'Unable to submit this business claim right now.'),
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
    submitClaim,
  };
}
