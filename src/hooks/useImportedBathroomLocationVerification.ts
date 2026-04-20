import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { verifyImportedBathroomLocation } from '@/api/imported-location-verifications';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { bathroomDetailQueryKey } from '@/hooks/useBathroomDetail';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import type { ImportedLocationVerificationInput, MutationOutcome } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';
import { useToast } from '@/hooks/useToast';

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

export function useImportedBathroomLocationVerification(bathroomId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const submitVerification = useCallback(
    async (locationExists: boolean, note?: string | null): Promise<MutationOutcome> => {
      if (!bathroomId) {
        throw new Error('A bathroom identifier is required before verifying an imported location.');
      }

      const input: ImportedLocationVerificationInput = {
        bathroom_id: bathroomId,
        location_exists: locationExists,
        note: note?.trim() || null,
      };
      const returnRoute = `/bathroom/${encodeURIComponent(bathroomId)}`;

      const authenticatedUser = requireAuth({
        type: 'verify_imported_location',
        route: returnRoute,
        params: {
          bathroom_id: bathroomId,
          location_exists: locationExists,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsSubmittingVerification(true);

      try {
        const result = await verifyImportedBathroomLocation(input);

        if (result.error) {
          throw result.error;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: bathroomDetailQueryKey(bathroomId),
          }),
          queryClient.invalidateQueries({
            queryKey: ['bathrooms'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['search'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['favorites'],
          }),
        ]);

        showToast({
          title: locationExists ? 'Location confirmed' : 'Location flagged',
          message: locationExists
            ? 'Thanks. This imported bathroom is marked as still here.'
            : 'Thanks. This imported bathroom is now flagged for freshness review.',
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
                bathroom_id: bathroomId,
                location_exists: locationExists,
                note: input.note ?? null,
              },
              authenticatedUser.id
            );

            showToast({
              title: 'Verification queued',
              message: 'You are offline. This imported location check will sync automatically when the network returns.',
              variant: 'warning',
            });

            return 'queued_retry';
          } catch (queueError) {
            showToast({
              title: 'Verification failed',
              message: getErrorMessage(queueError, 'We could not queue this imported location check right now.'),
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
          message: getErrorMessage(error, 'We could not save this imported location check right now.'),
          variant: 'error',
        });
        throw error;
      } finally {
        setIsSubmittingVerification(false);
      }
    },
    [bathroomId, queryClient, requireAuth, router, showToast]
  );

  return {
    isSubmittingVerification,
    submitVerification,
  };
}
