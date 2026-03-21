import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

import { useFavoritesStore } from '@/store/useFavoritesStore';

beforeEach(() => {
  useFavoritesStore.setState({
    ownerUserId: null,
    sortBy: 'date_added',
    favoritedIds: [],
    resolvedBathroomIds: [],
    optimisticToggles: {},
  });
});

describe('useFavoritesStore', () => {
  it('tracks optimistic removals separately from persisted ids', () => {
    const store = useFavoritesStore.getState();

    store.replaceFavoritedIds('550e8400-e29b-41d4-a716-446655440001', [
      '550e8400-e29b-41d4-a716-446655440002',
    ]);
    store.setOptimisticToggle(
      '550e8400-e29b-41d4-a716-446655440002',
      'removed'
    );

    expect(useFavoritesStore.getState().isFavorited('550e8400-e29b-41d4-a716-446655440002')).toBe(false);
    expect(
      useFavoritesStore.getState().isOptimisticallyRemoved('550e8400-e29b-41d4-a716-446655440002')
    ).toBe(true);
    expect(useFavoritesStore.getState().isPending('550e8400-e29b-41d4-a716-446655440002')).toBe(true);
  });

  it('syncs scoped ids without dropping favorites outside the current viewport', () => {
    const store = useFavoritesStore.getState();

    store.replaceFavoritedIds('550e8400-e29b-41d4-a716-446655440001', [
      '550e8400-e29b-41d4-a716-446655440010',
    ]);
    store.syncFavoritedIds(
      '550e8400-e29b-41d4-a716-446655440001',
      [
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
      ],
      ['550e8400-e29b-41d4-a716-446655440003']
    );

    expect(useFavoritesStore.getState().favoritedIds).toEqual([
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440003',
    ]);
  });

  it('marks scoped bathroom ids as resolved after hydrating favorite state', () => {
    const store = useFavoritesStore.getState();

    store.syncFavoritedIds(
      '550e8400-e29b-41d4-a716-446655440001',
      [
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
      ],
      ['550e8400-e29b-41d4-a716-446655440003']
    );

    expect(useFavoritesStore.getState().isFavoriteResolved('550e8400-e29b-41d4-a716-446655440002')).toBe(true);
    expect(useFavoritesStore.getState().isFavoriteResolved('550e8400-e29b-41d4-a716-446655440003')).toBe(true);
  });
});
