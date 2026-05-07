import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { createBathroomAccessCode, upsertCodeVote } from '@/api/access-codes';
import { submitBathroomAccessibilityUpdate } from '@/api/accessibility';
import { submitBugReport } from '@/api/bug-reports';
import { upsertCleanlinessRating } from '@/api/cleanliness-ratings';
import { addFavorite, removeFavorite } from '@/api/favorites';
import { reportBathroomStatus } from '@/api/notifications';
import { createBathroomReport } from '@/api/reports';
import { reportBathroomLiveStatusEvent } from '@/api/restroom-intelligence';
import { verifySourceRecordLocation } from '@/api/source-record-verifications';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { validateBathroomAccessibilityUpdate } from '@/lib/validators';
import { isNetworkStateOnline } from '@/lib/network-state';
import { offlineSyncController } from '@/lib/offline-sync-controller';
import { offlineQueue } from '@/lib/offline-queue';
import { isBathroomLiveStatusEventMutationPayload } from '@/lib/live-status-event-queue';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useOfflineSyncStore } from '@/store/useOfflineSyncStore';
import {
  BathroomAccessibilityMutationPayload,
  BathroomStatusMutationPayload,
  CleanlinessRatingMutationPayload,
  CodeSubmitMutationPayload,
  CodeVoteMutationPayload,
  FavoriteMutationPayload,
  ReportType,
  SourceRecordVerificationMutationPayload,
} from '@/types';
import { isTransientNetworkError } from '@/utils/network';
import { bugReportPayloadSchema } from '@/utils/validate';

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

function isSourceRecordVerificationMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & SourceRecordVerificationMutationPayload {
  return (
    typeof payload.source_record_id === 'string' &&
    payload.source_record_id.length > 0 &&
    typeof payload.location_exists === 'boolean' &&
    (typeof payload.note === 'undefined' || payload.note === null || typeof payload.note === 'string')
  );
}

function isBathroomAccessibilityMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & BathroomAccessibilityMutationPayload {
  try {
    validateBathroomAccessibilityUpdate(payload);
    return true;
  } catch (_e) {
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
      useOfflineSyncStore.getState().setOnline(false);
      return;
    }

    useOfflineSyncStore.getState().markSyncStarted();

    try {
      const snapshot = offlineQueue.getSnapshot();
      const hasMutationsOtherThanBugReports = Object.entries(snapshot.pending_by_type).some(
        ([type, count]) => type !== 'bug_report' && (count ?? 0) > 0
      );

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

            if (!addResult.error) {
              useFavoritesStore.getState().addFavoritedId(userId, mutation.payload.bathroom_id);
              useFavoritesStore.getState().clearOptimisticToggle(mutation.payload.bathroom_id);
              return true;
            }

            if (isTransientNetworkError(addResult.error)) {
              return false;
            }

            useFavoritesStore.getState().clearOptimisticToggle(mutation.payload.bathroom_id);
            return true;
          }
          case 'favorite_remove': {
            if (!isFavoriteMutationPayload(mutation.payload)) {
              return false;
            }

            const removeResult = await removeFavorite(userId, mutation.payload.bathroom_id);

            if (!removeResult.error) {
              useFavoritesStore.getState().removeFavoritedId(userId, mutation.payload.bathroom_id);
              useFavoritesStore.getState().clearOptimisticToggle(mutation.payload.bathroom_id);
              return true;
            }

            if (isTransientNetworkError(removeResult.error)) {
              return false;
            }

            useFavoritesStore.getState().clearOptimisticToggle(mutation.payload.bathroom_id);
            return true;
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
            if (!reportResult.error) {
              return true;
            }

            return !isTransientNetworkError(reportResult.error);
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
            if (!statusResult.error) {
              return true;
            }

            return !isTransientNetworkError(statusResult.error);
          }
          case 'live_status_event': {
            if (!isBathroomLiveStatusEventMutationPayload(mutation.payload)) {
              return false;
            }

            const statusEventResult = await reportBathroomLiveStatusEvent({
              bathroomId: mutation.payload.bathroom_id,
              statusType: mutation.payload.status_type,
              statusValue: mutation.payload.status_value,
              waitMinutes: mutation.payload.wait_minutes ?? null,
              occupancyLevel: mutation.payload.occupancy_level ?? null,
              suppliesMissing: mutation.payload.supplies_missing ?? [],
              confidenceScore: mutation.payload.confidence_score,
              evidencePhotoUrl: mutation.payload.evidence_photo_url ?? null,
            });

            if (!statusEventResult.error) {
              return true;
            }

            return !isTransientNetworkError(statusEventResult.error);
          }
          case 'location_verification': {
            if (!isSourceRecordVerificationMutationPayload(mutation.payload)) {
              return false;
            }

            const verificationResult = await verifySourceRecordLocation({
              source_record_id: mutation.payload.source_record_id,
              location_exists: mutation.payload.location_exists,
              note: typeof mutation.payload.note === 'string' ? mutation.payload.note : null,
            });

            if (!verificationResult.error) {
              return true;
            }

            return !isTransientNetworkError(verificationResult.error);
          }
          case 'accessibility_update': {
            if (!isBathroomAccessibilityMutationPayload(mutation.payload)) {
              return false;
            }

            const accessibilityResult = await submitBathroomAccessibilityUpdate(mutation.payload);
            return !accessibilityResult.error;
          }
          case 'bug_report': {
            const parsed = bugReportPayloadSchema.safeParse(mutation.payload);

            if (!parsed.success) {
              return true; // Drop malformed payload.
            }

            const bugResult = await submitBugReport(parsed.data);

            if (bugResult.success || bugResult.isTerminal) {
              return true; // Success or terminal error — remove from queue.
            }

            return false; // Transient error — retry later.
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
            queryKey: ['favorites'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['code-vote'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['bathroom-detail'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['source-candidate-detail'],
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

        if (hasMutationsOtherThanBugReports) {
          showToast({
            title: 'Offline changes synced',
            message: 'Queued updates are now synced with your account.',
            variant: 'success',
          });
        }
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

      useOfflineSyncStore.getState().markSyncResult(result);
    } catch (error) {
      useOfflineSyncStore
        .getState()
        .markWarning(error instanceof Error ? error.message : 'Unable to process the offline queue right now.');
    }
  }, [queryClient, showToast, userId]);

  useEffect(() => {
    if (!userId) {
      useOfflineSyncStore.getState().reset();
      return;
    }

    const unsubscribe = offlineQueue.subscribe((snapshot) => {
      useOfflineSyncStore.getState().setQueueSnapshot(snapshot);
    });

    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void offlineQueue.initialize(userId);
  }, [userId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = isNetworkStateOnline(state);
      useOfflineSyncStore.getState().setOnline(isConnected);

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

  useEffect(() => {
    return offlineSyncController.registerProcessor(processQueue);
  }, [processQueue]);
}
