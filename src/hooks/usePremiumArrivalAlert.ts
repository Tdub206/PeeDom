import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelPremiumArrivalAlert, fetchPremiumArrivalAlerts, upsertPremiumArrivalAlert } from '@/api/premium';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import type { PremiumArrivalAlert } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export const premiumArrivalAlertQueryKey = (bathroomId: string | null) =>
  ['premium', 'arrival-alert', bathroomId ?? 'unknown'] as const;

export const PREMIUM_ARRIVAL_ALERT_WINDOWS = [15, 30, 60] as const;

export function usePremiumArrivalAlert(bathroomId: string | null) {
  const queryClient = useQueryClient();
  const { isAuthenticated, profile } = useAuth();
  const { showToast } = useToast();
  const isPremiumUser = hasActivePremium(profile);

  const alertQuery = useQuery({
    queryKey: premiumArrivalAlertQueryKey(bathroomId),
    enabled: isAuthenticated && Boolean(bathroomId) && isPremiumUser,
    queryFn: async () => {
      if (!bathroomId) {
        return [] as PremiumArrivalAlert[];
      }

      const result = await fetchPremiumArrivalAlerts(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const armAlertMutation = useMutation({
    mutationFn: async (leadMinutes: (typeof PREMIUM_ARRIVAL_ALERT_WINDOWS)[number]) => {
      if (!bathroomId) {
        throw new Error('A bathroom must be selected before arming an arrival alert.');
      }

      if (!isAuthenticated) {
        throw new Error('Sign in to arm a premium arrival alert.');
      }

      if (!isPremiumUser) {
        throw new Error('Premium is required to arm arrival alerts.');
      }

      if (!profile?.push_enabled) {
        throw new Error('Enable push notifications first so StallPass can warn you before you arrive.');
      }

      const targetArrivalAt = new Date(Date.now() + leadMinutes * 60 * 1000).toISOString();
      const result = await upsertPremiumArrivalAlert({
        bathroomId,
        targetArrivalAt,
        leadMinutes,
      });

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to arm this arrival alert right now.');
      }

      return result.data;
    },
    onSuccess: async (alert) => {
      await queryClient.invalidateQueries({
        queryKey: premiumArrivalAlertQueryKey(bathroomId),
      });

      showToast({
        title: 'Arrival alert armed',
        message: `StallPass will watch this bathroom for code changes while you are on the way for the next ${alert.lead_minutes} minutes.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Arrival alert unavailable',
        message: getErrorMessage(error, 'Unable to arm this arrival alert right now.'),
        variant: 'error',
      });
    },
  });

  const cancelAlertMutation = useMutation({
    mutationFn: async () => {
      if (!bathroomId) {
        throw new Error('A bathroom must be selected before cancelling an arrival alert.');
      }

      const result = await cancelPremiumArrivalAlert(bathroomId);

      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: premiumArrivalAlertQueryKey(bathroomId),
      });

      showToast({
        title: 'Arrival alert removed',
        message: 'StallPass will stop monitoring this bathroom for your trip.',
        variant: 'info',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Unable to cancel alert',
        message: getErrorMessage(error, 'Unable to cancel this arrival alert right now.'),
        variant: 'error',
      });
    },
  });

  const activeAlert = useMemo(() => alertQuery.data?.[0] ?? null, [alertQuery.data]);

  const armAlert = useCallback(async (leadMinutes: (typeof PREMIUM_ARRIVAL_ALERT_WINDOWS)[number]) => {
    await armAlertMutation.mutateAsync(leadMinutes);
  }, [armAlertMutation]);

  const cancelAlert = useCallback(async () => {
    await cancelAlertMutation.mutateAsync();
  }, [cancelAlertMutation]);

  return {
    activeAlert,
    alertsError: alertQuery.error ? getErrorMessage(alertQuery.error, 'Unable to load your arrival alert.') : null,
    armAlert,
    cancelAlert,
    isAlertLoading: alertQuery.isLoading,
    isAlertUpdating: armAlertMutation.isPending || cancelAlertMutation.isPending,
    isPremiumUser,
  };
}
