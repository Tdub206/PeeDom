/**
 * useCreateBathroomReportMutation
 *
 * Thin wrapper over useOfflineMutation for submitting bathroom reports.
 * Returns a mutateAsync that always resolves to MutationOutcome.
 *
 * Usage:
 *   const { createReport, isPending } = useCreateBathroomReportMutation();
 *
 *   const outcome = await createReport({
 *     bathroom_id: '...',
 *     report_type: 'wrong_code',
 *     notes: 'Code 1234 does not work',
 *   });
 *   if (outcome === 'auth_required') router.push('/(auth)/login');
 */

import { useCallback } from 'react';
import { useOfflineMutation } from './useOfflineMutation';
import { MutationOutcome } from '@/types';
import { ReportCreatePayload } from '@/lib/offline/mutation-registry';

export function useCreateBathroomReportMutation(options?: {
  onSuccess?: (outcome: MutationOutcome) => void;
  onAuthRequired?: () => void;
}) {
  const mutation = useOfflineMutation<ReportCreatePayload>({
    mutationType: 'report_create',
    onSuccess: (outcome) => options?.onSuccess?.(outcome),
    onAuthRequired: options?.onAuthRequired,
  });

  const createReport = useCallback(
    async (payload: ReportCreatePayload): Promise<MutationOutcome> => {
      return mutation.mutateAsync(payload);
    },
    [mutation]
  );

  return {
    createReport,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
