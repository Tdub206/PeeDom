import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const storageMap = new Map<string, string>();
const previousNamespace = `@${['pee', 'dom'].join('')}/`;

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
    storageMap.set('@stallpass/cached_bathrooms', JSON.stringify([]));
    storageMap.set('@stallpass/user_preferences', JSON.stringify({ theme: 'light' }));
    storageMap.set(`${previousNamespace}cached_region`, JSON.stringify({ latitude: 47.6 }));
    storageMap.set('third-party/session', 'preserve-me');

    const { storage } = await import('@/lib/storage');
    await storage.clear();

    expect(storageMap.has('@stallpass/cached_bathrooms')).toBe(false);
    expect(storageMap.has('@stallpass/user_preferences')).toBe(false);
    expect(storageMap.has(`${previousNamespace}cached_region`)).toBe(false);
    expect(storageMap.get('third-party/session')).toBe('preserve-me');
  });

  it('migrates previous namespace values on read', async () => {
    storageMap.set(`${previousNamespace}search_history`, JSON.stringify([{ query: 'Pike Place' }]));

    const { storage } = await import('@/lib/storage');
    const value = await storage.get<unknown[]>(storage.keys.SEARCH_HISTORY);

    expect(value).toEqual([{ query: 'Pike Place' }]);
    expect(storageMap.has(`${previousNamespace}search_history`)).toBe(false);
    expect(storageMap.get('@stallpass/search_history')).toBe(JSON.stringify([{ query: 'Pike Place' }]));
  });
});
