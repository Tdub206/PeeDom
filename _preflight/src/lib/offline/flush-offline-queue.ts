/**
 * flush-offline-queue.ts — Flush Orchestrator
 *
 * Enforces all flush rules from spec §3:
 *
 *   • Flush only when activeUserId exists and matches the queue scope
 *   • Process only the queue for the active user
 *   • Stop on first auth_required; leave item in queue; abort remainder
 *   • Stop on first queued_retry; increment that item; leave remainder
 *   • If auth changes during flush, abort and persist remaining items unchanged
 *   • Batch query invalidations once per flush cycle (not once per mutation)
 *   • Toast once per flush cycle
 *
 * Flush triggers (called from useOfflineSync):
 *   • Network reconnect
 *   • App foreground
 *   • Auth transition from guest → authenticated
 */

import { QueryClient } from '@tanstack/react-query';
import { offlineQueue, buildRegistryExecutor } from './offline-queue';
import { getRegistryEntry } from './mutation-registry';
import { QueuedMutation } from '@/types';

export interface FlushResult {
  processed: number;
  stopped: boolean;
  stopReason?: 'auth_required' | 'max_retries' | 'user_changed';
}

export interface FlushOptions {
  queryClient: QueryClient;
  activeUserId: string;
  refreshUser: () => Promise<void>;
  /** Called once per flush cycle with the count of successfully replayed mutations */
  onFlushComplete?: (result: FlushResult) => void;
  /** Called if flush was aborted because auth changed mid-cycle */
  onAuthChanged?: () => void;
}

/**
 * Flush the offline queue for the active user.
 *
 * Safe to call multiple times — the queue manager guards against concurrent
 * processing internally. Returns immediately if a flush is already in progress.
 */
export async function flushOfflineQueue(options: FlushOptions): Promise<FlushResult> {
  const { queryClient, activeUserId, refreshUser, onFlushComplete, onAuthChanged } = options;

  // Gate: only flush if we have an active user
  if (!activeUserId) {
    return { processed: 0, stopped: false };
  }

  // Gate: queue must be initialized for this user
  const queueUserId = offlineQueue.getActiveUserId();
  if (queueUserId !== activeUserId) {
    console.warn(
      `[flush] Queue active user (${queueUserId}) !== auth user (${activeUserId}) — skipping`
    );
    return { processed: 0, stopped: false };
  }

  if (offlineQueue.getPendingCount() === 0) {
    return { processed: 0, stopped: false };
  }

  // Collect invalidation keys across all items that will be processed
  // so we can batch-invalidate after the flush cycle
  const pendingBefore = offlineQueue.getPending();
  const batchInvalidationKeys = new Set<string>();

  // Pre-compute invalidation keys for items we're about to attempt
  for (const mutation of pendingBefore) {
    if (mutation.user_id !== activeUserId) continue;
    try {
      const entry = getRegistryEntry(mutation.type);
      const keys = entry.invalidationKeys(mutation.payload, activeUserId);
      for (const key of keys) {
        batchInvalidationKeys.add(JSON.stringify(key));
      }
    } catch {
      // Unknown mutation type — skip key collection, executor will handle
    }
  }

  const executor = buildRegistryExecutor(activeUserId, refreshUser);

  // Auth change guard: snapshot userId before async work
  const userIdAtFlushStart = activeUserId;

  const result = await offlineQueue.process(async (mutation: QueuedMutation) => {
    // Spec: if auth changes during flush, abort
    const currentQueueUser = offlineQueue.getActiveUserId();
    if (currentQueueUser !== userIdAtFlushStart) {
      console.warn('[flush] Auth changed during flush — aborting');
      onAuthChanged?.();
      return 'auth_required'; // stops the flush
    }

    return executor(mutation);
  });

  // Batch-invalidate all affected query keys once per flush cycle
  if (result.processed > 0) {
    const invalidationPromises = Array.from(batchInvalidationKeys).map((keyJson) => {
      const key = JSON.parse(keyJson) as readonly unknown[];
      return queryClient.invalidateQueries({ queryKey: key });
    });
    await Promise.allSettled(invalidationPromises);
  }

  const flushResult: FlushResult = {
    processed: result.processed,
    stopped: result.stopped,
    stopReason: result.reason,
  };

  onFlushComplete?.(flushResult);

  return flushResult;
}
