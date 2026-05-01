import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStallPassStateStorage } from '@/lib/zustand-persist-storage';
import type { FavoriteToggleAction, FavoritesSortOption } from '@/types';

interface OptimisticFavoriteState {
  pendingAction: FavoriteToggleAction;
  queuedForSync: boolean;
  initiatedAt: string;
}

interface FavoritesStoreState {
  ownerUserId: string | null;
  sortBy: FavoritesSortOption;
  favoritedIds: string[];
  resolvedBathroomIds: string[];
  optimisticToggles: Record<string, OptimisticFavoriteState>;
  setSortBy: (sortBy: FavoritesSortOption) => void;
  replaceFavoritedIds: (userId: string | null, ids: string[]) => void;
  syncFavoritedIds: (userId: string | null, scopeIds: string[], favoritedScopeIds: string[]) => void;
  addFavoritedId: (userId: string | null, bathroomId: string) => void;
  removeFavoritedId: (userId: string | null, bathroomId: string) => void;
  setOptimisticToggle: (
    bathroomId: string,
    action: FavoriteToggleAction,
    options?: { queuedForSync?: boolean; initiatedAt?: string }
  ) => void;
  markOptimisticToggleQueued: (bathroomId: string) => void;
  clearOptimisticToggle: (bathroomId: string) => void;
  clearFavoritedIds: () => void;
  isFavorited: (bathroomId: string) => boolean;
  isFavoriteResolved: (bathroomId: string) => boolean;
  isOptimisticallyRemoved: (bathroomId: string) => boolean;
  isPending: (bathroomId: string) => boolean;
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id.length > 0))];
}

function normalizeOwnerState(
  state: FavoritesStoreState,
  userId: string | null
): Pick<FavoritesStoreState, 'ownerUserId' | 'favoritedIds' | 'resolvedBathroomIds'> {
  if (!userId) {
    return {
      ownerUserId: null,
      favoritedIds: [],
      resolvedBathroomIds: [],
    };
  }

  if (state.ownerUserId && state.ownerUserId !== userId) {
    return {
      ownerUserId: userId,
      favoritedIds: [],
      resolvedBathroomIds: [],
    };
  }

  return {
    ownerUserId: userId,
    favoritedIds: state.favoritedIds,
    resolvedBathroomIds: state.resolvedBathroomIds,
  };
}

export const useFavoritesStore = create<FavoritesStoreState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      sortBy: 'date_added',
      favoritedIds: [],
      resolvedBathroomIds: [],
      optimisticToggles: {},

      setSortBy: (sortBy) => set({ sortBy }),

      replaceFavoritedIds: (userId, ids) =>
        set((state) => {
          const ownerState = normalizeOwnerState(state, userId);

          return {
            ownerUserId: ownerState.ownerUserId,
            favoritedIds: userId ? dedupeIds(ids) : [],
            resolvedBathroomIds: userId
              ? dedupeIds([...ownerState.resolvedBathroomIds, ...ids])
              : [],
          };
        }),

      syncFavoritedIds: (userId, scopeIds, favoritedScopeIds) =>
        set((state) => {
          const ownerState = normalizeOwnerState(state, userId);

          if (!userId) {
            return {
              ownerUserId: null,
              favoritedIds: [],
              resolvedBathroomIds: [],
            };
          }

          const scopeSet = new Set(scopeIds);
          const mergedIds = ownerState.favoritedIds.filter((id) => !scopeSet.has(id));

          return {
            ownerUserId: ownerState.ownerUserId,
            favoritedIds: dedupeIds([...mergedIds, ...favoritedScopeIds]),
            resolvedBathroomIds: dedupeIds([...ownerState.resolvedBathroomIds, ...scopeIds]),
          };
        }),

      addFavoritedId: (userId, bathroomId) =>
        set((state) => {
          const ownerState = normalizeOwnerState(state, userId);

          if (!userId) {
            return {
              ownerUserId: null,
              favoritedIds: [],
              resolvedBathroomIds: [],
            };
          }

          return {
            ownerUserId: ownerState.ownerUserId,
            favoritedIds: ownerState.favoritedIds.includes(bathroomId)
              ? ownerState.favoritedIds
              : [...ownerState.favoritedIds, bathroomId],
            resolvedBathroomIds: ownerState.resolvedBathroomIds.includes(bathroomId)
              ? ownerState.resolvedBathroomIds
              : [...ownerState.resolvedBathroomIds, bathroomId],
          };
        }),

      removeFavoritedId: (userId, bathroomId) =>
        set((state) => {
          const ownerState = normalizeOwnerState(state, userId);

          return {
            ownerUserId: ownerState.ownerUserId,
            favoritedIds: ownerState.favoritedIds.filter((id) => id !== bathroomId),
            resolvedBathroomIds: ownerState.resolvedBathroomIds.includes(bathroomId)
              ? ownerState.resolvedBathroomIds
              : [...ownerState.resolvedBathroomIds, bathroomId],
          };
        }),

      setOptimisticToggle: (bathroomId, action, options) =>
        set((state) => ({
          optimisticToggles: {
            ...state.optimisticToggles,
            [bathroomId]: {
              pendingAction: action,
              queuedForSync: options?.queuedForSync ?? false,
              initiatedAt: options?.initiatedAt ?? new Date().toISOString(),
            },
          },
        })),

      markOptimisticToggleQueued: (bathroomId) =>
        set((state) => {
          const currentToggle = state.optimisticToggles[bathroomId];

          if (!currentToggle) {
            return state;
          }

          return {
            optimisticToggles: {
              ...state.optimisticToggles,
              [bathroomId]: {
                ...currentToggle,
                queuedForSync: true,
              },
            },
          };
        }),

      clearOptimisticToggle: (bathroomId) =>
        set((state) => {
          const nextOptimisticToggles = { ...state.optimisticToggles };
          delete nextOptimisticToggles[bathroomId];

          return {
            optimisticToggles: nextOptimisticToggles,
          };
        }),

      clearFavoritedIds: () =>
        set({
          ownerUserId: null,
          favoritedIds: [],
          resolvedBathroomIds: [],
          optimisticToggles: {},
        }),

      isFavorited: (bathroomId) => {
        const state = get();
        const optimisticToggle = state.optimisticToggles[bathroomId];

        if (optimisticToggle) {
          return optimisticToggle.pendingAction === 'added';
        }

        return state.favoritedIds.includes(bathroomId);
      },

      isFavoriteResolved: (bathroomId) => get().resolvedBathroomIds.includes(bathroomId),

      isOptimisticallyRemoved: (bathroomId) =>
        get().optimisticToggles[bathroomId]?.pendingAction === 'removed',

      isPending: (bathroomId) => Boolean(get().optimisticToggles[bathroomId]),
    }),
    {
      name: '@stallpass/favorites',
      storage: createJSONStorage(() => createStallPassStateStorage()),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        sortBy: state.sortBy,
        favoritedIds: state.favoritedIds,
      }),
    }
  )
);

export const selectFavoriteSort = (state: FavoritesStoreState): FavoritesSortOption => state.sortBy;
