import { DEFAULT_ACCESSIBILITY_PREFERENCES, DEFAULT_SEARCH_DISCOVERY_FILTERS } from '@/types';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { useRealtimeStore } from '@/store/useRealtimeStore';
import { useSearchStore } from '@/store/useSearchStore';

export type SignOutStep =
  | 'cancel_queries'
  | 'clear_offline_queue'
  | 'clear_realtime_channels'
  | 'reset_client_state'
  | 'clear_query_cache'
  | 'supabase_sign_out';

export interface PerformUserSignOutDependencies {
  cancelQueries: () => Promise<unknown>;
  clearOfflineQueue: () => Promise<void>;
  clearRealtimeChannels: () => Promise<void>;
  clearQueryCache: () => void;
  signOut: () => Promise<void>;
  onError?: (step: SignOutStep, error: unknown) => void;
}

async function runSignOutStep(
  step: SignOutStep,
  operation: () => Promise<unknown> | void,
  onError?: (step: SignOutStep, error: unknown) => void
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    onError?.(step, error);
  }
}

export function resetUserScopedClientState(): void {
  const isAppInForeground = useRealtimeStore.getState().isAppInForeground;

  useFavoritesStore.setState({
    ownerUserId: null,
    sortBy: 'date_added',
    favoritedIds: [],
    resolvedBathroomIds: [],
    optimisticToggles: {},
  });

  useSearchStore.setState({
    activeQuery: '',
    committedQuery: '',
    phase: 'idle',
    discoveryFilters: DEFAULT_SEARCH_DISCOVERY_FILTERS,
  });

  useAccessibilityStore.setState({
    isAccessibilityMode: false,
    preferences: DEFAULT_ACCESSIBILITY_PREFERENCES,
    hydratedUserId: null,
    hasPendingChanges: false,
  });

  useFilterStore.setState({
    searchQuery: '',
    filters: {
      isAccessible: null,
      isLocked: null,
      isCustomerOnly: null,
      openNow: null,
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

  useMapStore.getState().reset();
  useBusinessStore.getState().reset();

  useRealtimeStore.setState({
    connectionState: isAppInForeground ? 'CLOSED' : 'CLOSING',
    channels: {},
    lastConnectedAt: null,
    reconnectAttempts: 0,
    isAppInForeground,
    pendingResubscriptions: [],
  });
}

export async function performUserSignOut(dependencies: PerformUserSignOutDependencies): Promise<void> {
  await runSignOutStep('cancel_queries', dependencies.cancelQueries, dependencies.onError);
  await runSignOutStep('clear_offline_queue', dependencies.clearOfflineQueue, dependencies.onError);
  await runSignOutStep('clear_realtime_channels', dependencies.clearRealtimeChannels, dependencies.onError);
  await runSignOutStep('reset_client_state', resetUserScopedClientState, dependencies.onError);
  await runSignOutStep('clear_query_cache', dependencies.clearQueryCache, dependencies.onError);
  await runSignOutStep('supabase_sign_out', dependencies.signOut, dependencies.onError);
}
