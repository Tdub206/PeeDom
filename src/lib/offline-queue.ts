import { storage } from './storage';
import { QueuedMutation, MutationType } from '@/types';

class OfflineQueueManager {
  private queue: QueuedMutation[] = [];
  private isProcessing = false;

  /**
   * Initialize queue from storage
   */
  async initialize(userId: string): Promise<void> {
    const stored = await storage.get<QueuedMutation[]>(storage.keys.OFFLINE_QUEUE);
    if (stored) {
      // Filter queue to only include mutations for current user
      this.queue = stored.filter(mutation => mutation.user_id === userId);
    } else {
      this.queue = [];
    }
  }

  /**
   * Add a mutation to the queue
   * Only call this for authenticated users with queueable mutation types
   */
  async enqueue(
    type: MutationType,
    payload: unknown,
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
  ): Promise<number> {
    if (this.isProcessing) {
      console.log('Queue is already being processed');
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;
    const MAX_RETRIES = 3;

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

              // Remove if max retries exceeded
              if (this.queue[mutationIndex].retry_count >= MAX_RETRIES) {
                console.warn(`Mutation ${mutation.id} exceeded max retries, removing from queue`);
                this.queue = this.queue.filter(m => m.id !== mutation.id);
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

            if (this.queue[mutationIndex].retry_count >= MAX_RETRIES) {
              this.queue = this.queue.filter(m => m.id !== mutation.id);
            }
          }
        }
      }

      await this.persist();
      return processedCount;
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
    return `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const offlineQueue = new OfflineQueueManager();
