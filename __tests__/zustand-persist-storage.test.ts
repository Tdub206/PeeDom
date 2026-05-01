import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const storageMap = new Map<string, string>();
const previousNamespace = `@${['pee', 'dom'].join('')}/`;

const asyncStorageMock = {
  getItem: jest.fn((key: string) => Promise.resolve(storageMap.get(key) ?? null)),
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

describe('StallPass Zustand persist storage', () => {
  beforeEach(() => {
    storageMap.clear();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('migrates previous namespace state to the StallPass key', async () => {
    const previousKey = `${previousNamespace}favorites`;
    const currentKey = '@stallpass/favorites';
    const persistedValue = JSON.stringify({
      state: {
        favoritedIds: ['bathroom-1'],
      },
      version: 0,
    });
    storageMap.set(previousKey, persistedValue);

    const { createStallPassStateStorage } = await import('@/lib/zustand-persist-storage');
    const stateStorage = createStallPassStateStorage();

    await expect(stateStorage.getItem(currentKey)).resolves.toBe(persistedValue);
    expect(storageMap.has(previousKey)).toBe(false);
    expect(storageMap.get(currentKey)).toBe(persistedValue);
  });
});
