import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

import { performUserSignOut, resetUserScopedClientState } from '@/lib/account-session';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { useRealtimeStore } from '@/store/useRealtimeStore';
import { useSearchStore } from '@/store/useSearchStore';

describe('account session helpers', () => {
  beforeEach(() => {
    useFavoritesStore.setState({
      ownerUserId: 'user-123',
      sortBy: 'name',
      favoritedIds: ['bath-1'],
      resolvedBathroomIds: ['bath-1'],
      optimisticToggles: {
        'bath-1': {
          pendingAction: 'added',
          queuedForSync: true,
          initiatedAt: '2026-03-20T12:00:00.000Z',
        },
      },
    });
    useSearchStore.setState({
      activeQuery: 'coffee',
      committedQuery: 'coffee',
      phase: 'results',
      discoveryFilters: {
        hasCode: true,
        radiusMeters: 1600,
      },
    });
    useAccessibilityStore.setState({
      isAccessibilityMode: true,
      preferences: {
        requireGrabBars: true,
        requireAutomaticDoor: true,
        requireGenderNeutral: false,
        requireFamilyRestroom: false,
        requireChangingTable: true,
        minDoorWidth: 32,
        minStallWidth: 60,
        prioritizeAccessible: true,
        hideNonAccessible: true,
      },
      hydratedUserId: 'user-123',
      hasPendingChanges: true,
    });
    useFilterStore.setState({
      searchQuery: 'library',
      filters: {
        isAccessible: true,
        isLocked: null,
        isCustomerOnly: null,
        openNow: true,
        noCodeRequired: null,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: null,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      },
    });
    useMapStore.setState({
      activeBathroomId: 'bath-1',
      userLocation: {
        latitude: 47.6,
        longitude: -122.3,
      },
      hasCenteredOnUser: true,
      region: {
        latitude: 47.6,
        longitude: -122.3,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      },
    });
    useBusinessStore.setState({
      selectedBathroomId: 'bath-1',
      isHoursEditorOpen: true,
    });
    useRealtimeStore.setState({
      connectionState: 'OPEN',
      channels: {
        'favorites:user:123': {
          channelName: 'favorites:user:123',
          status: 'SUBSCRIBED',
          subscribedAt: '2026-03-20T12:00:00.000Z',
          errorCount: 0,
          lastErrorAt: null,
          refCount: 1,
        },
      },
      lastConnectedAt: '2026-03-20T12:00:00.000Z',
      reconnectAttempts: 2,
      isAppInForeground: false,
      pendingResubscriptions: ['favorites:user:123'],
    });
  });

  it('resets user-scoped client state back to signed-out defaults', () => {
    resetUserScopedClientState();

    expect(useFavoritesStore.getState().ownerUserId).toBeNull();
    expect(useFavoritesStore.getState().sortBy).toBe('date_added');
    expect(useFavoritesStore.getState().favoritedIds).toEqual([]);
    expect(useSearchStore.getState().phase).toBe('idle');
    expect(useSearchStore.getState().discoveryFilters).toEqual({
      hasCode: null,
      radiusMeters: 8047,
    });
    expect(useAccessibilityStore.getState().isAccessibilityMode).toBe(false);
    expect(useAccessibilityStore.getState().hydratedUserId).toBeNull();
    expect(useFilterStore.getState().searchQuery).toBe('');
    expect(useMapStore.getState().activeBathroomId).toBeNull();
    expect(useBusinessStore.getState().selectedBathroomId).toBeNull();
    expect(useRealtimeStore.getState().connectionState).toBe('CLOSING');
    expect(useRealtimeStore.getState().channels).toEqual({});
  });

  it('continues through sign-out teardown steps even when one step fails', async () => {
    const executionOrder: string[] = [];
    const onError = jest.fn();

    await performUserSignOut({
      cancelQueries: async () => {
        executionOrder.push('cancel_queries');
      },
      clearOfflineQueue: async () => {
        executionOrder.push('clear_offline_queue');
        throw new Error('queue failed');
      },
      clearRealtimeChannels: async () => {
        executionOrder.push('clear_realtime_channels');
      },
      clearQueryCache: () => {
        executionOrder.push('clear_query_cache');
      },
      signOut: async () => {
        executionOrder.push('supabase_sign_out');
      },
      onError,
    });

    expect(executionOrder).toEqual([
      'cancel_queries',
      'clear_offline_queue',
      'clear_realtime_channels',
      'clear_query_cache',
      'supabase_sign_out',
    ]);
    expect(onError).toHaveBeenCalledWith('clear_offline_queue', expect.any(Error));
    expect(useFavoritesStore.getState().ownerUserId).toBeNull();
  });
});
