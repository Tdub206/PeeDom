import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { verifySourceRecordLocation } from '@/api/source-record-verifications';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { bathroomDetailQueryKey } from '@/hooks/useBathroomDetail';
import { sourceCandidateDetailQueryKey } from '@/hooks/useSourceCandidateDetail';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely, replaceSafely } from '@/lib/navigation';
import type { MutationOutcome, SourceRecordVerificationInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface VerificationError extends Error {
  code?: string;
  nextAllowedAt?: string | null;
}

function formatNextAllowedAt(nextAllowedAt: string | null | undefined): string | null {
  if (!nextAllowedAt) {
    return null;
  }

  const parsedDate = new Date(nextAllowedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleString();
}

export function useSourceRecordVerification(sourceRecordId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const submitVerification = useCallback(
    async (locationExists: boolean, note?: string | null): Promise<MutationOutcome> => {
      if (!sourceRecordId) {
        throw new Error('A source record identifier is required before verifying this candidate.');
      }

      const input: SourceRecordVerificationInput = {
        source_record_id: sourceRecordId,
        location_exists: locationExists,
        note: note?.trim() || null,
      };
      const returnRoute = `/candidate/${encodeURIComponent(sourceRecordId)}`;

      const authenticatedUser = requireAuth({
        type: 'verify_source_candidate',
        route: returnRoute,
        params: {
          source_record_id: sourceRecordId,
          location_exists: locationExists,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsSubmittingVerification(true);

      try {
        const result = await verifySourceRecordLocation(input);

        if (result.error) {
          throw result.error;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: sourceCandidateDetailQueryKey(sourceRecordId),
          }),
          queryClient.invalidateQueries({
            queryKey: ['bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['nearby-bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['search'],
          }),
        ]);

        if (result.data?.listing_promoted && result.data.canonical_bathroom_id) {
          await queryClient.invalidateQueries({
            queryKey: bathroomDetailQueryKey(result.data.canonical_bathroom_id),
          });

          showToast({
            title: 'Candidate promoted',
            message: 'This location is now a permanent StallPass bathroom.',
            variant: 'success',
          });
          replaceSafely(router, routes.bathroomDetail(result.data.canonical_bathroom_id), routes.tabs.map);
          return 'completed';
        }

        showToast({
          title: locationExists ? 'Location confirmed' : 'Location flagged',
          message: locationExists
            ? 'Thanks. This source candidate is marked as still here.'
            : 'Thanks. This source candidate is now flagged for freshness review.',
          variant: locationExists ? 'success' : 'warning',
        });

        return 'completed';
      } catch (error) {
        const errorWithCode = error as VerificationError;

        if (isTransientNetworkError(error)) {
          try {
            await offlineQueue.enqueue(
              'location_verification',
              {
                source_record_id: sourceRecordId,
                location_exists: locationExists,
                note: input.note ?? null,
              },
              authenticatedUser.id
            );

            showToast({
              title: 'Verification queued',
              message: 'You are offline. This source candidate check will sync automatically when the network returns.',
              variant: 'warning',
            });

            return 'queued_retry';
          } catch (queueError) {
            showToast({
              title: 'Verification failed',
              message: getErrorMessage(queueError, 'We could not queue this source candidate check right now.'),
              variant: 'error',
            });
            throw queueError;
          }
        }

        if (typeof errorWithCode.code === 'string' && errorWithCode.code.toUpperCase() === 'COOLDOWN_ACTIVE') {
          const formattedCooldown = formatNextAllowedAt(errorWithCode.nextAllowedAt);

          showToast({
            title: 'Verification on cooldown',
            message: formattedCooldown
              ? `You already checked this location recently. You can verify it again after ${formattedCooldown}.`
              : 'You already checked this location recently. Please wait for the cooldown to finish before retrying.',
            variant: 'warning',
          });
          throw error;
        }

        showToast({
          title: 'Verification failed',
          message: getErrorMessage(error, 'We could not save this source candidate check right now.'),
          variant: 'error',
        });
        throw error;
      } finally {
        setIsSubmittingVerification(false);
      }
    },
    [queryClient, requireAuth, router, showToast, sourceRecordId]
  );

  return {
    isSubmittingVerification,
    submitVerification,
  };
}
