import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const storageMap = new Map<string, string>();

const asyncStorageMock = {
  getAllKeys: jest.fn(() => Promise.resolve([...storageMap.keys()])),
  getItem: jest.fn((key: string) => Promise.resolve(storageMap.get(key) ?? null)),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((key) => [key, storageMap.get(key) ?? null]))),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => storageMap.delete(key));
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    storageMap.delete(key);
    return Promise.resolve();
  }),
  setItem: jest.fn((key: string, value: string) => {
    storageMap.set(key, value);
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: asyncStorageMock,
}));

describe('offline queue manager', () => {
  beforeEach(() => {
    storageMap.clear();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('migrates the legacy shared queue without deleting another user queue', async () => {
    const userAMutation = {
      id: 'mutation-a',
      type: 'favorite_add',
      payload: {
        bathroom_id: 'bathroom-a',
      },
      created_at: '2026-04-05T10:00:00.000Z',
      retry_count: 0,
      last_attempt_at: null,
      user_id: 'user-a',
    };
    const userBMutation = {
      id: 'mutation-b',
      type: 'favorite_remove',
      payload: {
        bathroom_id: 'bathroom-b',
      },
      created_at: '2026-04-05T10:01:00.000Z',
      retry_count: 0,
      last_attempt_at: null,
      user_id: 'user-b',
    };

    storageMap.set('@peedom/offline_queue', JSON.stringify([userAMutation, userBMutation]));

    const { getOfflineQueueStorageKey, offlineQueue } = await import('@/lib/offline-queue');

    await offlineQueue.initialize('user-a');

    expect(offlineQueue.getPending()).toEqual([userAMutation]);
    expect(JSON.parse(storageMap.get(getOfflineQueueStorageKey('user-a')) ?? '[]')).toEqual([userAMutation]);
    expect(JSON.parse(storageMap.get('@peedom/offline_queue') ?? '[]')).toEqual([userBMutation]);

    await offlineQueue.initialize('user-b');

    expect(offlineQueue.getPending()).toEqual([userBMutation]);
  });

  it('clears only the active user queue', async () => {
    const userAMutation = {
      id: 'mutation-a',
      type: 'favorite_add',
      payload: {
        bathroom_id: 'bathroom-a',
      },
      created_at: '2026-04-05T10:00:00.000Z',
      retry_count: 0,
      last_attempt_at: null,
      user_id: 'user-a',
    };
    const userBMutation = {
      id: 'mutation-b',
      type: 'favorite_remove',
      payload: {
        bathroom_id: 'bathroom-b',
      },
      created_at: '2026-04-05T10:01:00.000Z',
      retry_count: 0,
      last_attempt_at: null,
      user_id: 'user-b',
    };

    const { getOfflineQueueStorageKey, offlineQueue } = await import('@/lib/offline-queue');

    storageMap.set(getOfflineQueueStorageKey('user-a'), JSON.stringify([userAMutation]));
    storageMap.set(getOfflineQueueStorageKey('user-b'), JSON.stringify([userBMutation]));

    await offlineQueue.initialize('user-a');
    await offlineQueue.clear();

    expect(storageMap.has(getOfflineQueueStorageKey('user-a'))).toBe(false);
    expect(JSON.parse(storageMap.get(getOfflineQueueStorageKey('user-b')) ?? '[]')).toEqual([userBMutation]);
  });

  it('keeps retrying queued mutations until the fourth failure drops them', async () => {
    const { offlineQueue } = await import('@/lib/offline-queue');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await offlineQueue.initialize('user-a');
      await offlineQueue.enqueue(
        'favorite_add',
        {
          bathroom_id: 'bathroom-a',
        },
        'user-a'
      );

      const firstAttempt = await offlineQueue.process(async () => false);
      const secondAttempt = await offlineQueue.process(async () => false);
      const thirdAttempt = await offlineQueue.process(async () => false);
      const fourthAttempt = await offlineQueue.process(async () => false);

      expect(firstAttempt).toEqual({
        processed_count: 0,
        dropped_count: 0,
        pending_count: 1,
      });
      expect(secondAttempt.pending_count).toBe(1);
      expect(thirdAttempt.pending_count).toBe(1);
      expect(fourthAttempt).toEqual({
        processed_count: 0,
        dropped_count: 1,
        pending_count: 0,
      });
      expect(offlineQueue.getPendingCount()).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('publishes queue snapshots when mutations are queued and processed', async () => {
    const { offlineQueue } = await import('@/lib/offline-queue');
    const snapshots: number[] = [];

    await offlineQueue.initialize('user-a');

    const unsubscribe = offlineQueue.subscribe((snapshot) => {
      snapshots.push(snapshot.pending_count);
    });

    try {
      await offlineQueue.enqueue(
        'status_report',
        {
          bathroom_id: 'bathroom-a',
          status: 'clean',
        },
        'user-a'
      );

      await offlineQueue.process(async () => true);

      expect(snapshots).toEqual([0, 1, 0]);
    } finally {
      unsubscribe();
    }
  });
});
