/**
 * Thin client for the `verify-access-code` edge function. Provides a mutation
 * per action (confirm / deny / update) that pipes device fingerprint and
 * (optionally) coarse location through to the sybil layer.
 *
 * Unlike `useBathroomCodeVerification` (which edits `code_votes` directly),
 * this hook calls the enriched server-side RPC so the full ledger / consensus
 * / points pipeline fires in one round trip.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyAccessCode } from '@/api/access-intelligence';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { bathroomPredictionQueryKey } from '@/hooks/useBathroomPredictions';
import type {
  CodeVerificationAction,
  VerifyAccessCodeResult,
} from '@/types/access-intelligence';

export interface UseAccessCodeVerificationOptions {
  bathroomId: string;
  latitude?: number | null;
  longitude?: number | null;
  onSuccess?: (result: VerifyAccessCodeResult) => void;
  onError?: (error: Error) => void;
}

export interface UseAccessCodeVerificationResult {
  confirm: () => Promise<VerifyAccessCodeResult | null>;
  deny: () => Promise<VerifyAccessCodeResult | null>;
  update: (newCode: string) => Promise<VerifyAccessCodeResult | null>;
  isPending: boolean;
  lastError: Error | null;
}

export function useAccessCodeVerification(
  options: UseAccessCodeVerificationOptions
): UseAccessCodeVerificationResult {
  const { bathroomId, latitude, longitude, onSuccess, onError } = options;
  const { fingerprint } = useDeviceFingerprint();
  const queryClient = useQueryClient();

  const runMutation = useMutation({
    mutationFn: async (input: {
      action: CodeVerificationAction;
      reportedCode?: string | null;
    }): Promise<VerifyAccessCodeResult> => {
      const response = await verifyAccessCode({
        bathroomId,
        action: input.action,
        reportedCode: input.reportedCode ?? null,
        deviceFingerprint: fingerprint,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      });
      if (response.error) {
        throw response.error;
      }
      if (!response.data) {
        throw new Error('No verification response received');
      }
      return response.data;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: bathroomPredictionQueryKey(bathroomId) });
      onSuccess?.(result);
    },
    onError: (err: unknown) => {
      const error = err instanceof Error ? err : new Error('Verification failed');
      onError?.(error);
    },
  });

  const confirm = useCallback(
    async () => runMutation.mutateAsync({ action: 'confirm' }),
    [runMutation]
  );

  const deny = useCallback(
    async () => runMutation.mutateAsync({ action: 'deny' }),
    [runMutation]
  );

  const update = useCallback(
    async (newCode: string) => runMutation.mutateAsync({ action: 'update', reportedCode: newCode }),
    [runMutation]
  );

  return useMemo(
    () => ({
      confirm,
      deny,
      update,
      isPending: runMutation.isPending,
      lastError: runMutation.error instanceof Error ? runMutation.error : null,
    }),
    [confirm, deny, update, runMutation.isPending, runMutation.error]
  );
}
