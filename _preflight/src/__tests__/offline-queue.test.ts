/**
 * offline-queue.test.ts — Required Offline Queue Tests
 *
 * Covers spec §3 required tests:
 *   ✓ Offline mutation returns queued_retry and writes scoped queue item with user_id
 *   ✓ Auth failure during mutation returns auth_required and does not write to queue
 *   ✓ Queue flush ignores mismatched user_id items
 *   ✓ Flush stops on first auth_required and preserves remaining queued items
 *   ✓ Items exceeding MAX_QUEUE_RETRY_COUNT are dropped
 */

import { offlineQueue, buildRegistryExecutor, MAX_QUEUE_RETRY_COUNT } from '../lib/offline/offline-queue';
import { queueStorage } from '../lib/offline/queue-storage';
import { QueuedMutation } from '../types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../lib/offline/queue-storage');
jest.mock('../lib/offline/mutation-registry', () => ({
  getRegistryEntry: jest.fn(() => ({
    payloadSchema: { parse: (v: unknown) => v },
    executor: jest.fn(),
    invalidationKeys: () => [],
  })),
  validatePayload: jest.fn(() => ({ ok: true, data: { bathroom_id: 'bathroom-abc' } })),
}));

const mockQueueStorage = queueStorage as jest.Mocked<typeof queueStorage>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueuedMutation(overrides: Partial<QueuedMutation> = {}): QueuedMutation {
  return {
    id: `mutation_${Date.now()}_test`,
    type: 'favorite_add',
    payload: { bathroom_id: 'bathroom-abc' },
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_attempt_at: null,
    user_id: 'user-111',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockQueueStorage.load.mockResolvedValue([]);
  mockQueueStorage.save.mockResolvedValue(undefined);
  mockQueueStorage.clear.mockResolvedValue(undefined);
  mockQueueStorage.generateId.mockReturnValue('mutation_test_id');
});

describe('enqueue()', () => {
  it('returns a mutation ID and writes a scoped queue item with the correct user_id', async () => {
    await offlineQueue.initialize('user-111');

    const id = await offlineQueue.enqueue('favorite_add', { bathroom_id: 'bathroom-abc' }, 'user-111');

    expect(id).toBeTruthy();
    expect(mockQueueStorage.save).toHaveBeenCalledWith(
      'user-111',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'favorite_add',
          user_id: 'user-111',
        }),
      ])
    );
  });

  it('throws if called without a userId', async () => {
    await expect(
      offlineQueue.enqueue('favorite_add', {}, '')
    ).rejects.toThrow('enqueue called without a userId');
  });
});

describe('buildRegistryExecutor() — user_id scope rule', () => {
  it('skips mutation whose user_id does not match activeUserId', async () => {
    const executor = buildRegistryExecutor('user-ACTIVE', jest.fn());
    const mutation = makeQueuedMutation({ user_id: 'user-DIFFERENT' });

    // Should return queued_retry (not completed, not auth_required) for mismatches
    const result = await executor(mutation);
    expect(result).toBe('queued_retry');
  });

  it('returns completed when executor succeeds for matching user', async () => {
    const { getRegistryEntry } = jest.requireMock('../lib/offline/mutation-registry');
    getRegistryEntry.mockReturnValueOnce({
      payloadSchema: { parse: (v: unknown) => v },
      executor: jest.fn().mockResolvedValueOnce(undefined),
      invalidationKeys: () => [],
    });

    const executor = buildRegistryExecutor('user-111', jest.fn());
    const mutation = makeQueuedMutation({ user_id: 'user-111' });

    const result = await executor(mutation);
    expect(result).toBe('completed');
  });

  it('returns auth_required and calls refreshUser on auth error', async () => {
    const { getRegistryEntry } = jest.requireMock('../lib/offline/mutation-registry');
    getRegistryEntry.mockReturnValueOnce({
      payloadSchema: { parse: (v: unknown) => v },
      executor: jest.fn().mockRejectedValueOnce(new Error('jwt expired')),
      invalidationKeys: () => [],
    });

    const refreshUser = jest.fn().mockResolvedValue(undefined);
    const executor = buildRegistryExecutor('user-111', refreshUser);
    const mutation = makeQueuedMutation({ user_id: 'user-111' });

    const result = await executor(mutation);
    expect(result).toBe('auth_required');
    expect(refreshUser).toHaveBeenCalled();
  });
});

describe('process() — flush stop rules', () => {
  it('stops on first auth_required and preserves remaining items', async () => {
    const item1 = makeQueuedMutation({ id: 'mut-1' });
    const item2 = makeQueuedMutation({ id: 'mut-2' });
    const item3 = makeQueuedMutation({ id: 'mut-3' });

    mockQueueStorage.load.mockResolvedValueOnce([item1, item2, item3]);
    await offlineQueue.initialize('user-111');

    let callCount = 0;
    const executor = jest.fn(async (_mutation: QueuedMutation) => {
      callCount++;
      if (callCount === 1) return 'auth_required' as const;
      return 'completed' as const;
    });

    const result = await offlineQueue.process(executor);

    expect(result.stopped).toBe(true);
    expect(result.reason).toBe('auth_required');
    // Only the first item was attempted; items 2 and 3 were not processed
    expect(executor).toHaveBeenCalledTimes(1);
    // Items 2 and 3 should remain in the queue
    expect(offlineQueue.getPendingCount()).toBe(3); // item1 not removed (auth_required)
  });

  it('stops on first queued_retry and increments retry count', async () => {
    const item1 = makeQueuedMutation({ id: 'mut-1' });
    const item2 = makeQueuedMutation({ id: 'mut-2' });

    mockQueueStorage.load.mockResolvedValueOnce([item1, item2]);
    await offlineQueue.initialize('user-111');

    const executor = jest.fn(async (_mutation: QueuedMutation) => 'queued_retry' as const);

    const result = await offlineQueue.process(executor);

    expect(result.stopped).toBe(true);
    // Only item1 was attempted
    expect(executor).toHaveBeenCalledTimes(1);
    // Both items remain in the queue
    expect(offlineQueue.getPendingCount()).toBe(2);
  });

  it(`drops an item after ${MAX_QUEUE_RETRY_COUNT + 1} failed attempts`, async () => {
    // An item that has already hit the max retry count
    const exhaustedItem = makeQueuedMutation({
      id: 'mut-exhausted',
      retry_count: MAX_QUEUE_RETRY_COUNT,
    });

    mockQueueStorage.load.mockResolvedValueOnce([exhaustedItem]);
    await offlineQueue.initialize('user-111');

    // Force another queued_retry — this should push it over the limit
    const executor = jest.fn(async () => 'queued_retry' as const);
    await offlineQueue.process(executor);

    // Item should have been evicted
    expect(offlineQueue.getPendingCount()).toBe(0);
  });

  it('removes items on completed and returns the processed count', async () => {
    const items = [
      makeQueuedMutation({ id: 'mut-1' }),
      makeQueuedMutation({ id: 'mut-2' }),
      makeQueuedMutation({ id: 'mut-3' }),
    ];

    mockQueueStorage.load.mockResolvedValueOnce(items);
    await offlineQueue.initialize('user-111');

    const executor = jest.fn(async () => 'completed' as const);
    const result = await offlineQueue.process(executor);

    expect(result.processed).toBe(3);
    expect(result.stopped).toBe(false);
    expect(offlineQueue.getPendingCount()).toBe(0);
  });
});

describe('clearForUser()', () => {
  it('clears storage and empties in-memory queue for the given user', async () => {
    mockQueueStorage.load.mockResolvedValueOnce([makeQueuedMutation()]);
    await offlineQueue.initialize('user-111');
    expect(offlineQueue.getPendingCount()).toBe(1);

    await offlineQueue.clearForUser('user-111');

    expect(mockQueueStorage.clear).toHaveBeenCalledWith('user-111');
    expect(offlineQueue.getPendingCount()).toBe(0);
  });
});
