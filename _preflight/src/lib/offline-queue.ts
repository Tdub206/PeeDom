import { storage } from './storage';
import { QueuedMutation, MutationType, QueueProcessResult } from '@/types';
import { queuedMutationsSchema } from '@/utils/validate';

export const MAX_QUEUE_RETRY_COUNT = 3;

export function shouldDropQueuedMutation(nextRetryCount: number): boolean {
  return nextRetryCount > MAX_QUEUE_RETRY_COUNT;
}

class OfflineQueueManager {
  private queue: QueuedMutation[] = [];
  private isProcessing = false;

  /**
   * Initialize queue from storage
   */
  async initialize(userId: string): Promise<void> {
    const stored = await storage.get<unknown>(storage.keys.OFFLINE_QUEUE);
    const parsedQueue = queuedMutationsSchema.safeParse(stored);

    if (!parsedQueue.success) {
      this.queue = [];
      await storage.remove(storage.keys.OFFLINE_QUEUE);
      return;
    }

    this.queue = parsedQueue.data.filter((mutation) => mutation.user_id === userId);
    await this.persist();
  }

  /**
   * Add a mutation to the queue
   * Only call this for authenticated users with queueable mutation types
   */
  async enqueue(
    type: MutationType,
    payload: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    const mutation: QueuedMutation = {
      id: this.generateMutationId(),
      type,
      payload,
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_attempt_at: null,
      user_id: userId,
    };

    this.queue.push(mutation);
    await this.persist();
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
            this.queue = this.queue.filter(m => m.id !== mutation.id);
            processedCount++;
          } else {
            // Increment retry count
            const mutationIndex = this.queue.findIndex(m => m.id === mutation.id);
            if (mutationIndex !== -1) {
              this.queue[mutationIndex].retry_count++;
              this.queue[mutationIndex].last_attempt_at = new Date().toISOString();

              // Allow three replay attempts and drop on the fourth failed replay.
              if (shouldDropQueuedMutation(this.queue[mutationIndex].retry_count)) {
                console.warn(`Mutation ${mutation.id} exceeded max retries, removing from queue`);
                this.queue = this.queue.filter(m => m.id !== mutation.id);
                droppedCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing mutation ${mutation.id}:`, error);
          
          // Increment retry count on error
          const mutationIndex = this.queue.findIndex(m => m.id === mutation.id);
          if (mutationIndex !== -1) {
            this.queue[mutationIndex].retry_count++;
            this.queue[mutationIndex].last_attempt_at = new Date().toISOString();

            if (shouldDropQueuedMutation(this.queue[mutationIndex].retry_count)) {
              this.queue = this.queue.filter(m => m.id !== mutation.id);
              droppedCount++;
            }
          }
        }
      }

      await this.persist();
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
    await storage.remove(storage.keys.OFFLINE_QUEUE);
  }

  /**
   * Clear mutations for a specific user
   */
  async clearForUser(userId: string): Promise<void> {
    this.queue = this.queue.filter(m => m.user_id !== userId);
    await this.persist();
  }

  private async persist(): Promise<void> {
    await storage.set(storage.keys.OFFLINE_QUEUE, this.queue);
  }

  private generateMutationId(): string {
    return `mutation_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const offlineQueue = new OfflineQueueManager();
