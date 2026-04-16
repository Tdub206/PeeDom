/**
 * In-memory ring buffer for Access Intelligence events. Buffers up to 100
 * events, flushes on batch fill or a timed interval. Consumers call
 * `enqueue()` to append and `flush()` to drain. Actual dispatch is delegated
 * — the store itself has no fetch dependency so it stays testable.
 */

import { create } from 'zustand';
import type { AccessIntelligenceEventInput } from '@/types/access-intelligence';

const MAX_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 12_000;

export type EventBatchDispatcher = (
  events: AccessIntelligenceEventInput[]
) => Promise<{ inserted: number } | null>;

interface EventBatchState {
  queue: AccessIntelligenceEventInput[];
  dispatcher: EventBatchDispatcher | null;
  flushing: boolean;
  intervalHandle: ReturnType<typeof setInterval> | null;
  setDispatcher: (dispatcher: EventBatchDispatcher | null) => void;
  enqueue: (event: AccessIntelligenceEventInput) => void;
  flush: () => Promise<number>;
  startAutoFlush: () => void;
  stopAutoFlush: () => void;
  reset: () => void;
}

export const useEventBatchStore = create<EventBatchState>((set, get) => ({
  queue: [],
  dispatcher: null,
  flushing: false,
  intervalHandle: null,

  setDispatcher(dispatcher) {
    set({ dispatcher });
  },

  enqueue(event) {
    const next = [...get().queue, event].slice(-MAX_BATCH_SIZE * 2);
    set({ queue: next });
    if (next.length >= MAX_BATCH_SIZE) {
      void get().flush();
    }
  },

  async flush() {
    const { queue, dispatcher, flushing } = get();
    if (flushing || queue.length === 0 || !dispatcher) {
      return 0;
    }
    const batch = queue.slice(0, MAX_BATCH_SIZE);
    set({ flushing: true, queue: queue.slice(batch.length) });
    try {
      const result = await dispatcher(batch);
      return result?.inserted ?? batch.length;
    } catch {
      // On failure, push events back to the front so they're retried.
      set((prev) => ({ queue: [...batch, ...prev.queue] }));
      return 0;
    } finally {
      set({ flushing: false });
    }
  },

  startAutoFlush() {
    if (get().intervalHandle) return;
    const handle = setInterval(() => {
      void get().flush();
    }, FLUSH_INTERVAL_MS);
    set({ intervalHandle: handle });
  },

  stopAutoFlush() {
    const { intervalHandle } = get();
    if (intervalHandle) {
      clearInterval(intervalHandle);
      set({ intervalHandle: null });
    }
  },

  reset() {
    const { intervalHandle } = get();
    if (intervalHandle) clearInterval(intervalHandle);
    set({ queue: [], dispatcher: null, flushing: false, intervalHandle: null });
  },
}));
