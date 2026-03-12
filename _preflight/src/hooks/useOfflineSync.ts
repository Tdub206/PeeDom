/**
 * useOfflineSync — Offline Sync Orchestrator
 *
 * Responsibilities (this file only):
 *   • Hydrate the scoped queue when the authenticated user changes
 *   • Listen to NetInfo reconnect events and trigger flush
 *   • Listen to AppState foreground transitions and trigger flush
 *   • Listen to auth transitions from guest → authenticated and trigger flush
 *
 * This hook does NOT contain mutation logic, retry logic, or queue storage.
 * Those concerns live in:
 *   - src/lib/offline/offline-queue.ts
 *   - src/lib/offline/flush-offline-queue.ts
 *   - src/lib/offline/mutation-registry.ts
 *
 * Mount once in the root layout or a top-level screen provider.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useIsAuthenticated } from '@/store/useAuthStore';
import { useAuthContext } from '@/contexts/AuthProvider';
import { offlineQueue } from '@/lib/offline/offline-queue';
import { flushOfflineQueue } from '@/lib/offline/flush-offline-queue';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuthContext();
  const isAuthenticated = useIsAuthenticated();
  const userId = useAuthStore((s) => s.user?.id);

  // Track previous auth state to detect guest → authenticated transition
  const wasAuthenticatedRef = useRef(false);
  const isFlushing = useRef(false);

  const flush = useCallback(async () => {
    if (isFlushing.current) return;
    if (!userId || !isAuthenticated) return;

    isFlushing.current = true;

    try {
      const result = await flushOfflineQueue({
        queryClient,
        activeUserId: userId,
        refreshUser,
        onFlushComplete: (res) => {
          if (res.processed > 0) {
            console.log(
              `[useOfflineSync] Flushed ${res.processed} item(s)` +
                (res.stopped ? ` (stopped: ${res.stopReason})` : '')
            );
            // TODO: Toast notification — batch, once per flush cycle
            // Example: Toast.show(`${res.processed} action(s) synced`);
          }
        },
        onAuthChanged: () => {
          console.warn('[useOfflineSync] Auth changed mid-flush — aborting');
        },
      });

      return result;
    } finally {
      isFlushing.current = false;
    }
  }, [userId, isAuthenticated, queryClient, refreshUser]);

  // ── Hydrate queue when user changes ────────────────────────────────────────

  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    void offlineQueue.initialize(userId).then(() => {
      // Flush after hydration in case there are pending items from a previous session
      void flush();
    });
  }, [userId, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth transition: guest → authenticated ─────────────────────────────────

  useEffect(() => {
    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;

    if (!wasAuthenticated && isAuthenticated && userId) {
      // Transition detected — flush any mutations queued while offline/guest
      void flush();
    }
  }, [isAuthenticated, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── NetInfo: reconnect ─────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      if (isOnline && isAuthenticated && userId) {
        console.log('[useOfflineSync] Network reconnected — triggering flush');
        void flush();
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AppState: foreground ───────────────────────────────────────────────────

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isAuthenticated && userId) {
        console.log('[useOfflineSync] App foregrounded — triggering flush');
        void flush();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    flush,
    pendingCount: offlineQueue.getPendingCount(),
  };
}
