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

describe('storage helpers', () => {
  beforeEach(() => {
    storageMap.clear();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('clears only StallPass namespaced keys', async () => {
    storageMap.set('@peedom/cached_bathrooms', JSON.stringify([]));
    storageMap.set('@peedom/user_preferences', JSON.stringify({ theme: 'light' }));
    storageMap.set('third-party/session', 'preserve-me');

    const { storage } = await import('@/lib/storage');
    await storage.clear();

    expect(storageMap.has('@peedom/cached_bathrooms')).toBe(false);
    expect(storageMap.has('@peedom/user_preferences')).toBe(false);
    expect(storageMap.get('third-party/session')).toBe('preserve-me');
  });
});
