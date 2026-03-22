import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Storage mock — mirrors the shape used by OfflineQueueManager
// ---------------------------------------------------------------------------
const storageStore: Record<string, unknown> = {};

jest.mock('@/lib/storage', () => ({
  storage: {
    keys: {
      OFFLINE_QUEUE: 'offline_queue',
    },
    get: jest.fn(async (key: string) => storageStore[key] ?? null),
    set: jest.fn(async (key: string, value: unknown) => {
      storageStore[key] = value;
    }),
    remove: jest.fn(async (key: string) => {
      delete storageStore[key];
    }),
  },
}));

// Re-import after mocks are in place
import { offlineQueue, MAX_QUEUE_RETRY_COUNT, shouldDropQueuedMutation } from '@/lib/offline-queue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = 'user-aaa';
const USER_B = 'user-bbb';

function alwaysSucceed(): Promise<boolean> {
  return Promise.resolve(true);
}

function alwaysFail(): Promise<boolean> {
  return Promise.resolve(false);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('OfflineQueueManager — integration', () => {
  beforeEach(async () => {
    // Clear in-memory queue and backing storage between tests
    await offlineQueue.clear();
    Object.keys(storageStore).forEach((k) => delete storageStore[k]);
  });

  // ---- Enqueue / getPending -----------------------------------------------

  it('enqueues a mutation and makes it retrievable via getPending', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);

    const pending = offlineQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('favorite_add');
    expect(pending[0].user_id).toBe(USER_A);
    expect(pending[0].retry_count).toBe(0);
    expect(pending[0].last_attempt_at).toBeNull();
  });

  it('assigns a unique id and ISO created_at to each mutation', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);
    await offlineQueue.enqueue('favorite_remove', { bathroom_id: 'b-2' }, USER_A);

    const pending = offlineQueue.getPending();
    expect(pending[0].id).not.toBe(pending[1].id);
    expect(new Date(pending[0].created_at).toISOString()).toBe(pending[0].created_at);
  });

  // ---- Successful processing -----------------------------------------------

  it('removes a mutation from the queue on successful execution', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);
    expect(offlineQueue.getPendingCount()).toBe(1);

    const result = await offlineQueue.process(alwaysSucceed);

    expect(result.processed_count).toBe(1);
    expect(result.dropped_count).toBe(0);
    expect(result.pending_count).toBe(0);
    expect(offlineQueue.getPending()).toHaveLength(0);
  });

  it('processes multiple mutations in order and clears all on success', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);
    await offlineQueue.enqueue('code_submit', { bathroom_id: 'b-2', code_value: '1234' }, USER_A);
    await offlineQueue.enqueue('report_create', { bathroom_id: 'b-3', report_type: 'closed', notes: null }, USER_A);

    const executionOrder: string[] = [];
    const result = await offlineQueue.process(async (mutation) => {
      executionOrder.push(mutation.type);
      return true;
    });

    expect(result.processed_count).toBe(3);
    expect(executionOrder).toEqual(['favorite_add', 'code_submit', 'report_create']);
    expect(offlineQueue.getPendingCount()).toBe(0);
  });

  // ---- Failed processing / retry -------------------------------------------

  it('increments retry_count and sets last_attempt_at on failed execution', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);

    await offlineQueue.process(alwaysFail);

    const pending = offlineQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].retry_count).toBe(1);
    expect(pending[0].last_attempt_at).not.toBeNull();
  });

  it('retains the mutation through exactly three failed attempts', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);

    // Attempt 1, 2, 3 — should stay in queue
    for (let attempt = 1; attempt <= MAX_QUEUE_RETRY_COUNT; attempt++) {
      await offlineQueue.process(alwaysFail);
      expect(offlineQueue.getPendingCount()).toBe(1);
      expect(offlineQueue.getPending()[0].retry_count).toBe(attempt);
    }
  });

  it('drops the mutation on the fourth failed attempt', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);

    // Drive it to MAX_QUEUE_RETRY_COUNT failures
    for (let i = 0; i < MAX_QUEUE_RETRY_COUNT; i++) {
      await offlineQueue.process(alwaysFail);
    }
    expect(offlineQueue.getPendingCount()).toBe(1);

    // This is the attempt that pushes retry_count beyond the cap
    const result = await offlineQueue.process(alwaysFail);

    expect(result.dropped_count).toBe(1);
    expect(result.pending_count).toBe(0);
    expect(offlineQueue.getPendingCount()).toBe(0);
  });

  it('drops a mutation that throws during execution after exceeding MAX_QUEUE_RETRY_COUNT', async () => {
    await offlineQueue.enqueue('code_submit', { bathroom_id: 'b-1', code_value: '9999' }, USER_A);

    const throwing = (): Promise<boolean> => {
      throw new Error('Network error');
    };

    // Run past the retry cap using throwing executor
    for (let i = 0; i <= MAX_QUEUE_RETRY_COUNT; i++) {
      await offlineQueue.process(throwing);
    }

    expect(offlineQueue.getPendingCount()).toBe(0);
  });

  // ---- shouldDropQueuedMutation standalone ---------------------------------

  it('shouldDropQueuedMutation returns false for counts 1–MAX and true beyond', () => {
    for (let i = 1; i <= MAX_QUEUE_RETRY_COUNT; i++) {
      expect(shouldDropQueuedMutation(i)).toBe(false);
    }
    expect(shouldDropQueuedMutation(MAX_QUEUE_RETRY_COUNT + 1)).toBe(true);
    expect(shouldDropQueuedMutation(MAX_QUEUE_RETRY_COUNT + 100)).toBe(true);
  });

  // ---- User scoping --------------------------------------------------------

  it('initializes only the current user\'s mutations from storage', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-2' }, USER_B);
    expect(offlineQueue.getPendingCount()).toBe(2);

    // Re-initialize as USER_A — should only see USER_A's mutations
    await offlineQueue.initialize(USER_A);

    const pending = offlineQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].user_id).toBe(USER_A);
  });

  it('clearForUser removes only that user\'s mutations', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-2' }, USER_B);

    await offlineQueue.clearForUser(USER_A);

    const pending = offlineQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].user_id).toBe(USER_B);
  });

  // ---- Storage persistence -------------------------------------------------

  it('persists the queue to storage after enqueue', async () => {
    await offlineQueue.enqueue('rating_create', { bathroom_id: 'b-1', rating: 4, notes: null }, USER_A);

    const stored = storageStore['offline_queue'] as unknown[];
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(1);
  });

  it('initializes from a valid stored queue on next boot', async () => {
    // Simulate a stored queue left over from a previous session
    storageStore['offline_queue'] = [
      {
        id: 'mutation_boot_test',
        type: 'report_create',
        payload: { bathroom_id: 'b-99', report_type: 'closed', notes: null },
        created_at: new Date().toISOString(),
        retry_count: 1,
        last_attempt_at: new Date().toISOString(),
        user_id: USER_A,
      },
    ];

    await offlineQueue.initialize(USER_A);

    const pending = offlineQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('mutation_boot_test');
    expect(pending[0].retry_count).toBe(1);
  });

  it('wipes a corrupt queue from storage on initialize instead of crashing', async () => {
    storageStore['offline_queue'] = { not: 'an array' };

    await expect(offlineQueue.initialize(USER_A)).resolves.not.toThrow();
    expect(offlineQueue.getPendingCount()).toBe(0);
  });

  // ---- Concurrency guard ---------------------------------------------------

  it('skips a second concurrent process call and returns zero counts', async () => {
    await offlineQueue.enqueue('favorite_add', { bathroom_id: 'b-1' }, USER_A);

    let firstStarted = false;

    const slowExecutor = (): Promise<boolean> =>
      new Promise((resolve) => {
        firstStarted = true;
        // Resolve on next tick so the second call runs while the first is active
        Promise.resolve().then(() => resolve(true));
      });

    // Start two concurrent process calls
    const first = offlineQueue.process(slowExecutor);
    expect(firstStarted).toBe(true);
    const second = offlineQueue.process(alwaysSucceed);

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.processed_count).toBe(1);
    // Second call was skipped because first was already in flight
    expect(secondResult.processed_count).toBe(0);
  });
});
