import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomAccessCode, upsertCodeVote } from '@/api/access-codes';
import { submitBathroomAccessibilityUpdate } from '@/api/accessibility';
import { upsertCleanlinessRating } from '@/api/cleanliness-ratings';
import { addFavorite, removeFavorite } from '@/api/favorites';
import { reportBathroomStatus } from '@/api/notifications';
import { createBathroomReport } from '@/api/reports';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { validateBathroomAccessibilityUpdate } from '@/lib/validators';
import { isNetworkStateOnline } from '@/lib/network-state';
import { offlineQueue } from '@/lib/offline-queue';
import {
  BathroomAccessibilityMutationPayload,
  BathroomStatusMutationPayload,
  CleanlinessRatingMutationPayload,
  CodeSubmitMutationPayload,
  CodeVoteMutationPayload,
  FavoriteMutationPayload,
  ReportType,
} from '@/types';

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

function isCodeVoteMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & CodeVoteMutationPayload {
  return (
    typeof payload.code_id === 'string' &&
    payload.code_id.length > 0 &&
    (payload.vote === 1 || payload.vote === -1)
  );
}

function isCodeSubmitMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & CodeSubmitMutationPayload {
  return (
    typeof payload.bathroom_id === 'string' &&
    payload.bathroom_id.length > 0 &&
    typeof payload.code_value === 'string' &&
    payload.code_value.trim().length >= 2
  );
}

function isCleanlinessRatingMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & CleanlinessRatingMutationPayload {
  return (
    typeof payload.bathroom_id === 'string' &&
    payload.bathroom_id.length > 0 &&
    typeof payload.rating === 'number' &&
    Number.isInteger(payload.rating) &&
    payload.rating >= 1 &&
    payload.rating <= 5 &&
    (typeof payload.notes === 'undefined' || payload.notes === null || typeof payload.notes === 'string')
  );
}

function isBathroomStatusMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & BathroomStatusMutationPayload {
  return (
    typeof payload.bathroom_id === 'string' &&
    payload.bathroom_id.length > 0 &&
    typeof payload.status === 'string' &&
    ['clean', 'dirty', 'closed', 'out_of_order', 'long_wait'].includes(payload.status) &&
    (typeof payload.note === 'undefined' || payload.note === null || typeof payload.note === 'string')
  );
}

function isBathroomAccessibilityMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & BathroomAccessibilityMutationPayload {
  try {
    validateBathroomAccessibilityUpdate(payload);
    return true;
  } catch {
    return false;
  }
}

export function useOfflineSync() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isConnectedRef = useRef<boolean | null>(null);
  const userId = user?.id ?? null;

  const processQueue = useCallback(async () => {
    if (!userId) {
      return;
    }

    const networkState = await NetInfo.fetch();

    if (!isNetworkStateOnline(networkState)) {
      return;
    }

    const result = await offlineQueue.process(async (mutation) => {
      if (mutation.user_id !== userId) {
        return false;
      }

      switch (mutation.type) {
        case 'favorite_add': {
          if (!isFavoriteMutationPayload(mutation.payload)) {
            return false;
          }

          const addResult = await addFavorite(userId, mutation.payload.bathroom_id);
          return !addResult.error;
        }
        case 'favorite_remove': {
          if (!isFavoriteMutationPayload(mutation.payload)) {
            return false;
          }

          const removeResult = await removeFavorite(userId, mutation.payload.bathroom_id);
          return !removeResult.error;
        }
        case 'report_create': {
          if (!isReportMutationPayload(mutation.payload)) {
            return false;
          }

          const reportResult = await createBathroomReport(userId, {
            bathroom_id: mutation.payload.bathroom_id,
            report_type: mutation.payload.report_type,
            notes: typeof mutation.payload.notes === 'string' ? mutation.payload.notes : undefined,
          });
          return !reportResult.error;
        }
        case 'code_submit': {
          if (!isCodeSubmitMutationPayload(mutation.payload)) {
            return false;
          }

          const submissionResult = await createBathroomAccessCode(userId, {
            bathroom_id: mutation.payload.bathroom_id,
            code_value: mutation.payload.code_value,
          });
          return !submissionResult.error;
        }
        case 'code_vote': {
          if (!isCodeVoteMutationPayload(mutation.payload)) {
            return false;
          }

          const voteResult = await upsertCodeVote(userId, mutation.payload.code_id, mutation.payload.vote);
          return !voteResult.error;
        }
        case 'rating_create': {
          if (!isCleanlinessRatingMutationPayload(mutation.payload)) {
            return false;
          }

          const ratingResult = await upsertCleanlinessRating(userId, {
            bathroom_id: mutation.payload.bathroom_id,
            rating: mutation.payload.rating,
            notes: typeof mutation.payload.notes === 'string' ? mutation.payload.notes : undefined,
          });
          return !ratingResult.error;
        }
        case 'status_report': {
          if (!isBathroomStatusMutationPayload(mutation.payload)) {
            return false;
          }

          const statusResult = await reportBathroomStatus({
            bathroomId: mutation.payload.bathroom_id,
            status: mutation.payload.status,
            note: typeof mutation.payload.note === 'string' ? mutation.payload.note : null,
          });
          return !statusResult.error;
        }
        case 'accessibility_update': {
          if (!isBathroomAccessibilityMutationPayload(mutation.payload)) {
            return false;
          }

          const accessibilityResult = await submitBathroomAccessibilityUpdate(mutation.payload);
          return !accessibilityResult.error;
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
          queryKey: ['favorites', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['code-vote'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['search'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['cleanliness-rating'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathroom-live-status'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['accessibility'],
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
  }, [queryClient, showToast, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void offlineQueue.initialize(userId);
  }, [userId]);

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
