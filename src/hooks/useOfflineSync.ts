import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { addFavorite, removeFavorite } from '@/api/favorites';
import { createBathroomReport } from '@/api/reports';
import { useAuth } from '@/contexts/AuthContext';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { isNetworkStateOnline } from '@/lib/network-state';
import { offlineQueue } from '@/lib/offline-queue';
import { FavoriteMutationPayload, ReportType } from '@/types';
import { useToast } from '@/hooks/useToast';

function isFavoriteMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & FavoriteMutationPayload {
  return typeof payload.bathroom_id === 'string' && payload.bathroom_id.length > 0;
}

const REPORT_TYPES: ReportType[] = [
  'wrong_code',
  'closed',
  'unsafe',
  'duplicate',
  'incorrect_hours',
  'no_restroom',
  'other',
];

interface ReportMutationPayload {
  bathroom_id: string;
  report_type: ReportType;
  notes?: string | null;
}

function isReportMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & ReportMutationPayload {
  return (
    typeof payload.bathroom_id === 'string' &&
    payload.bathroom_id.length > 0 &&
    typeof payload.report_type === 'string' &&
    REPORT_TYPES.includes(payload.report_type as ReportType) &&
    (typeof payload.notes === 'undefined' ||
      payload.notes === null ||
      typeof payload.notes === 'string')
  );
}

export function useOfflineSync() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isConnectedRef = useRef<boolean | null>(null);

  const processQueue = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    const networkState = await NetInfo.fetch();

    if (!isNetworkStateOnline(networkState)) {
      return;
    }

    const result = await offlineQueue.process(async (mutation) => {
      if (mutation.user_id !== user.id) {
        return false;
      }

      switch (mutation.type) {
        case 'favorite_add': {
          if (!isFavoriteMutationPayload(mutation.payload)) {
            return false;
          }

          const addResult = await addFavorite(user.id, mutation.payload.bathroom_id);
          return !addResult.error;
        }
        case 'favorite_remove': {
          if (!isFavoriteMutationPayload(mutation.payload)) {
            return false;
          }

          const removeResult = await removeFavorite(user.id, mutation.payload.bathroom_id);
          return !removeResult.error;
        }
        case 'report_create': {
          if (!isReportMutationPayload(mutation.payload)) {
            return false;
          }

          const reportResult = await createBathroomReport(user.id, {
            bathroom_id: mutation.payload.bathroom_id,
            report_type: mutation.payload.report_type,
            notes: typeof mutation.payload.notes === 'string' ? mutation.payload.notes : undefined,
          });
          return !reportResult.error;
        }
        default:
          return true;
      }
    });

    if (result.processed_count > 0) {
      void trackAnalyticsEvent('offline_queue_synced', {
        dropped_count: result.dropped_count,
        pending_count: result.pending_count,
        processed_count: result.processed_count,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['favorites', user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        }),
      ]);

      showToast({
        title: 'Offline changes synced',
        message: 'Queued updates are now synced with your account.',
        variant: 'success',
      });
    }

    if (result.dropped_count > 0) {
      void trackAnalyticsEvent('offline_queue_dropped', {
        dropped_count: result.dropped_count,
        pending_count: result.pending_count,
        processed_count: result.processed_count,
      });

      showToast({
        title: 'Some changes were dropped',
        message: 'A few queued updates could not be synced. Please retry those actions manually.',
        variant: 'warning',
      });
    }
  }, [queryClient, showToast, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void offlineQueue.initialize(user.id);
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = isNetworkStateOnline(state);

      if (isConnectedRef.current === false && isConnected) {
        void processQueue();
      }

      isConnectedRef.current = isConnected;
    });

    return unsubscribe;
  }, [processQueue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void processQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [processQueue]);
}
