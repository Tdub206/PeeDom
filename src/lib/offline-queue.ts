import { storage } from './storage';
import { QueuedMutation, MutationType, QueueProcessResult } from '@/types';
import { queuedMutationsSchema } from '@/utils/validate';

export const MAX_QUEUE_RETRY_COUNT = 3;
const LEGACY_OFFLINE_QUEUE_STORAGE_KEY = storage.keys.OFFLINE_QUEUE;

export interface OfflineQueueSnapshot {
  active_user_id: string | null;
  pending_count: number;
  pending_by_type: Partial<Record<MutationType, number>>;
  oldest_queued_at: string | null;
}

export function shouldDropQueuedMutation(nextRetryCount: number): boolean {
  return nextRetryCount > MAX_QUEUE_RETRY_COUNT;
}

export function getOfflineQueueStorageKey(userId: string): string {
  return `${storage.keys.OFFLINE_QUEUE}:${userId}`;
}

class OfflineQueueManager {
  private queue: QueuedMutation[] = [];
  private activeUserId: string | null = null;
  private isProcessing = false;
  private listeners = new Set<(snapshot: OfflineQueueSnapshot) => void>();

  private normalizePayload(payload: object): Record<string, unknown> {
    return Object.entries(payload).reduce<Record<string, unknown>>((nextPayload, [key, value]) => {
      nextPayload[key] = value;
      return nextPayload;
    }, {});
  }

  /**
   * Initialize queue from storage
   */
  async initialize(userId: string): Promise<void> {
    this.activeUserId = userId;

    const scopedKey = getOfflineQueueStorageKey(userId);
    const scopedQueue = (await this.readPersistedQueue(scopedKey)) ?? [];
    const legacyQueue = await this.readPersistedQueue(LEGACY_OFFLINE_QUEUE_STORAGE_KEY);
    const migratedQueue = this.extractUserQueue(userId, legacyQueue ?? []);

    this.queue = this.mergeQueues(scopedQueue, migratedQueue);
    await this.persistActiveQueue();
    this.emitSnapshot();

    if (legacyQueue !== null) {
      const remainingLegacyQueue = legacyQueue.filter((mutation) => mutation.user_id !== userId);

      if (remainingLegacyQueue.length > 0) {
        await storage.set(LEGACY_OFFLINE_QUEUE_STORAGE_KEY, remainingLegacyQueue);
      } else {
        await storage.remove(LEGACY_OFFLINE_QUEUE_STORAGE_KEY);
      }
    }
  }

  /**
   * Add a mutation to the queue
   * Only call this for authenticated users with queueable mutation types
   */
  async enqueue(
    type: MutationType,
    payload: object,
    userId: string
  ): Promise<void> {
    await this.ensureActiveQueue(userId);

    const mutation: QueuedMutation = {
      id: this.generateMutationId(),
      type,
      payload: this.normalizePayload(payload),
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_attempt_at: null,
      user_id: userId,
    };

    this.queue.push(mutation);
    await this.persistActiveQueue();
    this.emitSnapshot();
  }

  /**
   * Get all pending mutations
   */
  getPending(): QueuedMutation[] {
    return [...this.queue];
  }

  /**
   * Get count of pending mutations
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  getSnapshot(): OfflineQueueSnapshot {
    const pendingByType = this.queue.reduce<Partial<Record<MutationType, number>>>((counts, mutation) => {
      counts[mutation.type] = (counts[mutation.type] ?? 0) + 1;
      return counts;
    }, {});

    return {
      active_user_id: this.activeUserId,
      pending_count: this.queue.length,
      pending_by_type: pendingByType,
      oldest_queued_at: this.queue[0]?.created_at ?? null,
    };
  }

  subscribe(listener: (snapshot: OfflineQueueSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Process the queue
   * Returns number of successfully processed mutations
   */
  async process(
    executor: (mutation: QueuedMutation) => Promise<boolean>
  ): Promise<QueueProcessResult> {
    if (this.isProcessing) {
      console.log('Queue is already being processed');
      return {
        processed_count: 0,
        dropped_count: 0,
        pending_count: this.queue.length,
      };
    }

    this.isProcessing = true;
    let processedCount = 0;
    let droppedCount = 0;

    try {
      const mutations = [...this.queue];

      for (const mutation of mutations) {
        try {
          const success = await executor(mutation);

          if (success) {
            // Remove from queue on success
            this.queue = this.queue.filter((queuedMutation) => queuedMutation.id !== mutation.id);
            processedCount++;
          } else {
            // Increment retry count
            const mutationIndex = this.queue.findIndex((queuedMutation) => queuedMutation.id === mutation.id);
            if (mutationIndex !== -1) {
              this.queue[mutationIndex].retry_count++;
              this.queue[mutationIndex].last_attempt_at = new Date().toISOString();

              // Allow three replay attempts and drop on the fourth failed replay.
              if (shouldDropQueuedMutation(this.queue[mutationIndex].retry_count)) {
                console.warn(`Mutation ${mutation.id} exceeded max retries, removing from queue`);
                this.queue = this.queue.filter((queuedMutation) => queuedMutation.id !== mutation.id);
                droppedCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing mutation ${mutation.id}:`, error);

          // Increment retry count on error
          const mutationIndex = this.queue.findIndex((queuedMutation) => queuedMutation.id === mutation.id);
          if (mutationIndex !== -1) {
            this.queue[mutationIndex].retry_count++;
            this.queue[mutationIndex].last_attempt_at = new Date().toISOString();

            if (shouldDropQueuedMutation(this.queue[mutationIndex].retry_count)) {
              this.queue = this.queue.filter((queuedMutation) => queuedMutation.id !== mutation.id);
              droppedCount++;
            }
          }
        }
      }

      await this.persistActiveQueue();
      this.emitSnapshot();
      return {
        processed_count: processedCount,
        dropped_count: droppedCount,
        pending_count: this.queue.length,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear all mutations from queue
   */
  async clear(): Promise<void> {
    this.queue = [];

    if (!this.activeUserId) {
      return;
    }

    await storage.remove(getOfflineQueueStorageKey(this.activeUserId));
    this.emitSnapshot();
  }

  /**
   * Clear mutations for a specific user
   */
  async clearForUser(userId: string): Promise<void> {
    if (this.activeUserId === userId) {
      this.queue = [];
    }

    await storage.remove(getOfflineQueueStorageKey(userId));
    this.emitSnapshot();
  }

  private async ensureActiveQueue(userId: string): Promise<void> {
    if (this.activeUserId === userId) {
      return;
    }

    await this.initialize(userId);
  }

  private async readPersistedQueue(storageKey: string): Promise<QueuedMutation[] | null> {
    const storedValue = await storage.get<unknown>(storageKey);

    if (storedValue === null) {
      return null;
    }

    const parsedQueue = queuedMutationsSchema.safeParse(storedValue);

    if (!parsedQueue.success) {
      await storage.remove(storageKey);
      return null;
    }

    return parsedQueue.data;
  }

  private extractUserQueue(userId: string, queue: QueuedMutation[]): QueuedMutation[] {
    return queue.filter((mutation) => mutation.user_id === userId);
  }

  private mergeQueues(...queues: QueuedMutation[][]): QueuedMutation[] {
    const merged = new Map<string, QueuedMutation>();

    for (const queue of queues) {
      for (const mutation of queue) {
        if (!merged.has(mutation.id)) {
          merged.set(mutation.id, mutation);
        }
      }
    }

    return [...merged.values()];
  }

  private async persistActiveQueue(): Promise<void> {
    if (!this.activeUserId) {
      return;
    }

    await storage.set(getOfflineQueueStorageKey(this.activeUserId), this.queue);
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();

    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private generateMutationId(): string {
    return `mutation_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const offlineQueue = new OfflineQueueManager();
