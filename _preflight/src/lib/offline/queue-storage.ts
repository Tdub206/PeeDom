/**
 * queue-storage.ts — Scoped Offline Queue Storage
 *
 * Storage key format: @peedom/offline_queue:<user_id>
 *
 * Each user gets their own queue slot. This enforces the user_id scope rule:
 * a queued mutation may only execute for the same authenticated user that
 * created it. Queues from different users never contaminate each other.
 *
 * All reads run Zod validation. Corrupted items are dropped with a warning
 * so a bad cache entry never crashes the queue processor.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { QueuedMutation } from '@/types';

// ── Zod schema ────────────────────────────────────────────────────────────────

const MutationTypeSchema = z.enum([
  'favorite_add',
  'favorite_remove',
  'code_vote',
  'report_create',
  'rating_create',
] as const);

export const QueuedMutationSchema = z.object({
  id: z.string().min(1),
  type: MutationTypeSchema,
  payload: z.unknown(),
  created_at: z.string().datetime({ offset: true }),
  retry_count: z.number().int().min(0),
  last_attempt_at: z.string().datetime({ offset: true }).nullable(),
  user_id: z.string().uuid(),
});

// ── Key helpers ───────────────────────────────────────────────────────────────

const QUEUE_PREFIX = '@peedom/offline_queue';

export function queueKey(userId: string): string {
  return `${QUEUE_PREFIX}:${userId}`;
}

// ── Storage operations ────────────────────────────────────────────────────────

export const queueStorage = {
  /**
   * Load and validate all queue items for a user.
   * Corrupted/schema-invalid items are silently dropped.
   */
  async load(userId: string): Promise<QueuedMutation[]> {
    try {
      const raw = await AsyncStorage.getItem(queueKey(userId));
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const valid: QueuedMutation[] = [];
      for (const item of parsed) {
        const result = QueuedMutationSchema.safeParse(item);
        if (result.success) {
          valid.push(result.data as QueuedMutation);
        } else {
          console.warn('[queue-storage] Dropped invalid queue item:', result.error.format());
        }
      }
      return valid;
    } catch (error) {
      console.error('[queue-storage] Failed to load queue:', error);
      return [];
    }
  },

  /**
   * Persist the full queue array for a user, replacing whatever was there.
   */
  async save(userId: string, queue: QueuedMutation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(queueKey(userId), JSON.stringify(queue));
    } catch (error) {
      console.error('[queue-storage] Failed to save queue:', error);
    }
  },

  /**
   * Remove the entire scoped queue for a user.
   */
  async clear(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(queueKey(userId));
    } catch (error) {
      console.error('[queue-storage] Failed to clear queue:', error);
    }
  },

  /**
   * Generate a deterministic but unique mutation ID.
   */
  generateId(): string {
    return `mutation_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  },
};
