import { create } from 'zustand';
import { MutationType } from '@/types';
import { OfflineQueueSnapshot } from '@/lib/offline-queue';

export type OfflineSyncPhase = 'idle' | 'queued' | 'syncing' | 'synced' | 'warning';

interface OfflineSyncStoreState {
  isOnline: boolean;
  phase: OfflineSyncPhase;
  queueSnapshot: OfflineQueueSnapshot;
  lastProcessedCount: number;
  lastDroppedCount: number;
  lastSyncAt: string | null;
  lastWarningMessage: string | null;
  setOnline: (isOnline: boolean) => void;
  setQueueSnapshot: (snapshot: OfflineQueueSnapshot) => void;
  markSyncStarted: () => void;
  markSyncResult: (result: { processed_count: number; dropped_count: number; pending_count: number }) => void;
  markWarning: (message: string) => void;
  reset: () => void;
}

const EMPTY_QUEUE_SNAPSHOT: OfflineQueueSnapshot = {
  active_user_id: null,
  pending_count: 0,
  pending_by_type: {},
  oldest_queued_at: null,
};

export const useOfflineSyncStore = create<OfflineSyncStoreState>((set) => ({
  isOnline: true,
  phase: 'idle',
  queueSnapshot: EMPTY_QUEUE_SNAPSHOT,
  lastProcessedCount: 0,
  lastDroppedCount: 0,
  lastSyncAt: null,
  lastWarningMessage: null,
  setOnline: (isOnline) =>
    set((state) => ({
      isOnline,
      phase:
        state.phase === 'syncing'
          ? state.phase
          : state.queueSnapshot.pending_count > 0
            ? 'queued'
            : isOnline
              ? state.phase === 'warning'
                ? 'warning'
                : 'idle'
              : 'queued',
    })),
  setQueueSnapshot: (queueSnapshot) =>
    set((state) => ({
      queueSnapshot,
      phase:
        state.phase === 'syncing'
          ? 'syncing'
          : queueSnapshot.pending_count > 0
            ? 'queued'
            : state.lastDroppedCount > 0
              ? 'warning'
              : state.lastSyncAt
                ? 'synced'
                : 'idle',
    })),
  markSyncStarted: () =>
    set({
      phase: 'syncing',
      lastWarningMessage: null,
    }),
  markSyncResult: (result) =>
    set((state) => ({
      phase:
        result.dropped_count > 0
          ? 'warning'
          : result.pending_count > 0
            ? 'queued'
            : result.processed_count > 0
              ? 'synced'
              : state.queueSnapshot.pending_count > 0
                ? 'queued'
                : 'idle',
      lastProcessedCount: result.processed_count,
      lastDroppedCount: result.dropped_count,
      lastSyncAt:
        result.processed_count > 0 || result.dropped_count > 0
          ? new Date().toISOString()
          : state.lastSyncAt,
      lastWarningMessage:
        result.dropped_count > 0 ? 'Some queued changes could not be synced and need to be retried manually.' : null,
    })),
  markWarning: (message) =>
    set({
      phase: 'warning',
      lastWarningMessage: message,
    }),
  reset: () =>
    set({
      isOnline: true,
      phase: 'idle',
      queueSnapshot: EMPTY_QUEUE_SNAPSHOT,
      lastProcessedCount: 0,
      lastDroppedCount: 0,
      lastSyncAt: null,
      lastWarningMessage: null,
    }),
}));

export function formatQueuedMutationLabel(type: MutationType): string {
  switch (type) {
    case 'favorite_add':
    case 'favorite_remove':
      return 'Favorite changes';
    case 'code_submit':
      return 'Code submissions';
    case 'code_vote':
      return 'Code confirmations';
    case 'report_create':
      return 'Issue reports';
    case 'rating_create':
      return 'Cleanliness ratings';
    case 'status_report':
      return 'Live status updates';
    case 'accessibility_update':
      return 'Accessibility updates';
    default:
      return type;
  }
}
