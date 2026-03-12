import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomReport } from '@/api/reports';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { MutationOutcome, ReportCreate } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';
import { useToast } from '@/hooks/useToast';

export function useBathroomReports() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useCallback(
    async (reportInput: ReportCreate): Promise<MutationOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'report_bathroom',
        route: pathname,
        params: {
          bathroom_id: reportInput.bathroom_id,
          report_type: reportInput.report_type,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      setIsSubmitting(true);

      try {
        const result = await createBathroomReport(authenticatedUser.id, reportInput);

        if (result.error) {
          throw result.error;
        }

        await queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        });

        showToast({
          title: 'Report submitted',
          message: 'Thanks. We will use this report to improve bathroom reliability.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        if (isTransientNetworkError(error)) {
          try {
            await offlineQueue.enqueue(
              'report_create',
              {
                bathroom_id: reportInput.bathroom_id,
                report_type: reportInput.report_type,
                notes: reportInput.notes?.trim() || null,
              },
              authenticatedUser.id
            );

            showToast({
              title: 'Report queued',
              message: 'You are offline. The report will submit automatically when the network returns.',
              variant: 'warning',
            });

            return 'queued_retry';
          } catch (queueError) {
            showToast({
              title: 'Report failed',
              message: getErrorMessage(queueError, 'We could not queue your report right now.'),
              variant: 'error',
            });
            throw queueError;
          }
        }

        showToast({
          title: 'Report failed',
          message: getErrorMessage(error, 'We could not submit this report right now.'),
          variant: 'error',
        });
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [pathname, queryClient, requireAuth, router, showToast]
  );

  return {
    submitReport,
    isSubmitting,
  };
}
