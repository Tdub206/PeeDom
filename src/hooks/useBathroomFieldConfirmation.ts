import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomAttributeConfirmation } from '@/api/restroom-intelligence';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  buildFieldValueSnapshot,
  computeFieldConfirmationConfidence,
  isSupportedBathroomConfirmationField,
  type SupportedBathroomConfirmationField,
} from '@/lib/restroom-intelligence/field-confirmations';
import { pushSafely } from '@/lib/navigation';
import { useTrustTier } from '@/hooks/useTrustTier';
import type { BathroomAttributeConfirmationSourceType, MutationOutcome } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

interface ConfirmBathroomFieldInput {
  fieldName: SupportedBathroomConfirmationField;
  value: unknown;
  notes?: string | null;
  evidencePhotoUrl?: string | null;
  sourceType?: BathroomAttributeConfirmationSourceType;
}

export function useBathroomFieldConfirmation(bathroomId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const { tier } = useTrustTier();
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState(false);

  const confirmField = useCallback(
    async (input: ConfirmBathroomFieldInput): Promise<MutationOutcome> => {
      if (!bathroomId) {
        throw new Error('A bathroom identifier is required before confirming a field.');
      }

      if (!isSupportedBathroomConfirmationField(input.fieldName)) {
        throw new Error('This field cannot be confirmed from the current flow.');
      }

      const authenticatedUser = requireAuth({
        type: 'report_bathroom',
        route: `/bathroom/${bathroomId}`,
        params: {
          bathroom_id: bathroomId,
          field_name: input.fieldName,
        },
        replay_strategy: 'draft_resume',
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsSubmittingConfirmation(true);

      try {
        const confidenceScore = computeFieldConfirmationConfidence({
          sourceType: input.sourceType ?? 'user_report',
          trustScore: tier.trust_score,
          hasPhotoEvidence: Boolean(input.evidencePhotoUrl),
          repeatedConfirmations: 0,
        });

        const result = await createBathroomAttributeConfirmation({
          bathroomId,
          fieldName: input.fieldName,
          fieldValueSnapshot: buildFieldValueSnapshot(input.value),
          sourceType: input.sourceType ?? 'user_report',
          confidenceScore,
          notes: input.notes ?? null,
          evidencePhotoUrl: input.evidencePhotoUrl ?? null,
          sourceUserId: authenticatedUser.id,
        });

        if (result.error) {
          throw result.error;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bathroom-trust-summary', bathroomId] }),
          queryClient.invalidateQueries({ queryKey: ['bathroom-need-metadata', bathroomId] }),
          queryClient.invalidateQueries({ queryKey: ['bathroom-accessibility-details', bathroomId] }),
          queryClient.invalidateQueries({ queryKey: ['bathroom-live-status', bathroomId] }),
          queryClient.invalidateQueries({ queryKey: ['bathroom-detail', bathroomId] }),
          queryClient.invalidateQueries({ queryKey: ['bathrooms'] }),
          queryClient.invalidateQueries({ queryKey: ['search'] }),
        ]);

        showToast({
          title: 'Thanks for confirming',
          message: 'Your correction was saved and trust signals were refreshed.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save that correction right now.');
        showToast({
          title: 'Correction not saved',
          message,
          variant: 'error',
        });
        throw error;
      } finally {
        setIsSubmittingConfirmation(false);
      }
    },
    [bathroomId, queryClient, requireAuth, router, showToast, tier.trust_score]
  );

  return {
    confirmField,
    isSubmittingConfirmation,
  };
}
