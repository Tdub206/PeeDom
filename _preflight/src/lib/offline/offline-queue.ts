/**
 * offline-queue.ts — Offline Queue Manager
 *
 * Manages the in-memory queue for the currently active user.
 * Backed by scoped AsyncStorage via queue-storage.ts.
 *
 * Scope rules (enforced here):
 *   • initialize(userId) loads ONLY that user's scoped queue
 *   • enqueue() stamps user_id on every item
 *   • clearForUser() removes only that user's storage slot
 *   • process() is called from flush-offline-queue.ts; the flush layer
 *     enforces user_id matching before calling process()
 *
 * MAX_RETRY_COUNT = 3 — items are dropped on the 4th failed replay attempt.
 */

import { QueuedMutation, MutationType } from '@/types';
import { queueStorage } from './queue-storage';
import { getRegistryEntry, validatePayload } from './mutation-registry';

export const MAX_QUEUE_RETRY_COUNT = 3;

class OfflineQueueManager {
  private queue: QueuedMutation[] = [];
  private activeUserId: string | null = null;
  private isProcessing = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Load the scoped queue for the given authenticated user.
   * Replaces any previously loaded queue.
   */
  async initialize(userId: string): Promise<void> {
    this.activeUserId = userId;
    this.queue = await queueStorage.load(userId);
    console.log(
      `[offline-queue] Initialized for user ${userId}: ${this.queue.length} item(s)`
    );
  }

  // ── Write operations ───────────────────────────────────────────────────────

  /**
   * Validate and enqueue a mutation for the authenticated user.
   *
   * @returns The generated mutation ID (used in MutationOutcome queued_retry)
   * @throws If called without an active user or if payload fails Zod validation
   */
  async enqueue(
    type: MutationType,
    payload: unknown,
    userId: string
  ): Promise<string> {
    if (!userId) {
      throw new Error('[offline-queue] enqueue called without a userId');
    }

    // Validate payload against the registry schema before writing
    const validation = validatePayload(type, payload);
    if (!validation.ok) {
      throw new Error(
        `[offline-queue] Invalid payload for type "${type}": ${validation.error.message}`
      );
    }

    const id = queueStorage.generateId();
    const mutation: QueuedMutation = {
      id,
      type,
      payload: validation.data as Record<string, unknown>,
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_attempt_at: null,
      user_id: userId,
    };

    this.queue.push(mutation);
    await this.persist(userId);

    return id;
  }

  // ── Read operations ────────────────────────────────────────────────────────

  getPending(): QueuedMutation[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getActiveUserId(): string | null {
    return this.activeUserId;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  // ── Flush operations ───────────────────────────────────────────────────────

  /**
   * Process queued mutations one at a time using the registry executors.
   * Called by flush-offline-queue.ts which enforces user_id matching.
   *
   * The executor receives a mutation and returns:
   *   'completed'    → remove from queue
   *   'auth_required' → stop flush, leave item in queue
   *   'queued_retry' → increment retry, stop flush, leave remaining untouched
   *
   * @returns Object describing what happened this flush cycle
   */
  async process(
    executor: (mutation: QueuedMutation) => Promise<'completed' | 'auth_required' | 'queued_retry'>
  ): Promise<{ processed: number; stopped: boolean; reason?: 'auth_required' | 'max_retries' }> {
    if (this.isProcessing) {
      console.log('[offline-queue] Already processing — skipping concurrent flush');
      return { processed: 0, stopped: false };
    }

    if (!this.activeUserId) {
      console.warn('[offline-queue] process() called without active user');
      return { processed: 0, stopped: false };
    }

    this.isProcessing = true;
    let processed = 0;
    let stopped = false;
    let stopReason: 'auth_required' | 'max_retries' | undefined;

    try {
      // Snapshot the queue so items added during processing are not flushed
      const snapshot = [...this.queue];

      for (const mutation of snapshot) {
        const outcome = await executor(mutation);

        if (outcome === 'completed') {
          this.queue = this.queue.filter((m) => m.id !== mutation.id);
          processed++;
          continue;
        }

        if (outcome === 'auth_required') {
          // Spec: stop immediately, leave item in queue
          stopped = true;
          stopReason = 'auth_required';
          break;
        }

        if (outcome === 'queued_retry') {
          // Spec: increment retry, stop flush, leave remaining untouched
          this.incrementRetry(mutation.id);
          stopped = true;
          break;
        }
      }

      await this.persist(this.activeUserId);
    } finally {
      this.isProcessing = false;
    }

    return { processed, stopped, reason: stopReason };
  }

  // ── Clear operations ───────────────────────────────────────────────────────

  /**
   * Clear mutations for a specific user from storage AND in-memory queue.
   * Called on explicit sign-out.
   */
  async clearForUser(userId: string): Promise<void> {
    await queueStorage.clear(userId);
    if (this.activeUserId === userId) {
      this.queue = [];
      this.activeUserId = null;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private incrementRetry(mutationId: string): void {
    const index = this.queue.findIndex((m) => m.id === mutationId);
    if (index === -1) return;

    const updated = {
      ...this.queue[index],
      retry_count: this.queue[index].retry_count + 1,
      last_attempt_at: new Date().toISOString(),
    };
    this.queue[index] = updated;

    if (updated.retry_count > MAX_QUEUE_RETRY_COUNT) {
      console.warn(
        `[offline-queue] Mutation ${mutationId} exceeded MAX_QUEUE_RETRY_COUNT — dropping`
      );
      this.queue = this.queue.filter((m) => m.id !== mutationId);
    }
  }

  private async persist(userId: string): Promise<void> {
    await queueStorage.save(userId, this.queue);
  }
}

export const offlineQueue = new OfflineQueueManager();

// ── Executor factory (used by flush-offline-queue.ts) ─────────────────────────

/**
 * Build an executor function that uses the mutation registry to replay a
 * queued item. The executor enforces the user_id scope rule.
 *
 * @param activeUserId — the currently authenticated user's ID
 * @param refreshUser  — called when executor encounters an auth error
 */
export function buildRegistryExecutor(
  activeUserId: string,
  refreshUser: () => Promise<void>
): (mutation: QueuedMutation) => Promise<'completed' | 'auth_required' | 'queued_retry'> {
  return async (mutation: QueuedMutation) => {
    // Scope rule: never execute for a different user
    if (mutation.user_id !== activeUserId) {
      console.warn(
        `[offline-queue] Skipping mutation ${mutation.id}: ` +
          `user_id mismatch (queued=${mutation.user_id}, active=${activeUserId})`
      );
      return 'queued_retry'; // Leave in queue — correct user may sign in later
    }

    try {
      const entry = getRegistryEntry(mutation.type);
      await entry.executor(mutation.payload, activeUserId);
      return 'completed';
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';

      const isAuthError =
        msg.includes('jwt') ||
        msg.includes('not authenticated') ||
        msg.includes('invalid token') ||
        msg.includes('permission denied') ||
        msg.includes('row-level security');

      if (isAuthError) {
        console.warn('[offline-queue] Auth error during replay — stopping flush');
        void refreshUser();
        return 'auth_required';
      }

      // Transient network error — increment retry (handled by process())
      console.warn(`[offline-queue] Transient error for ${mutation.id}:`, error);
      return 'queued_retry';
    }
  };
}
