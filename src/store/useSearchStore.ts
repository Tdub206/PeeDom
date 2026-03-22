import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_SEARCH_DISCOVERY_FILTERS,
  SearchDiscoveryFilters,
  SearchPhase,
} from '@/types';

interface SearchStoreState {
  activeQuery: string;
  committedQuery: string;
  phase: SearchPhase;
  discoveryFilters: SearchDiscoveryFilters;
  setActiveQuery: (query: string) => void;
  commitQuery: (query?: string) => void;
  clearQuery: () => void;
  setPhase: (phase: SearchPhase) => void;
  setHasCode: (hasCode: boolean | null) => void;
  setRadiusMeters: (radiusMeters: number) => void;
  resetDiscoveryFilters: () => void;
}

export const useSearchStore = create<SearchStoreState>()(
  persist(
    (set) => ({
      activeQuery: '',
      committedQuery: '',
      phase: 'idle',
      discoveryFilters: DEFAULT_SEARCH_DISCOVERY_FILTERS,
      setActiveQuery: (query) =>
        set((state) => {
          const normalizedQuery = query;
          const trimmedQuery = normalizedQuery.trim();

          return {
            activeQuery: normalizedQuery,
            phase:
              trimmedQuery.length === 0 && state.committedQuery.length === 0
                ? 'idle'
                : trimmedQuery.length >= 2
                  ? 'typing'
                  : state.phase,
          };
        }),
      commitQuery: (query) =>
        set((state) => {
          const trimmedQuery = (query ?? state.activeQuery).trim();

          return {
            activeQuery: trimmedQuery,
            committedQuery: trimmedQuery,
            phase:
              trimmedQuery.length >= 2
                ? 'searching'
                : trimmedQuery.length === 0
                  ? 'idle'
                  : state.phase,
          };
        }),
      clearQuery: () =>
        set({
          activeQuery: '',
          committedQuery: '',
          phase: 'idle',
        }),
      setPhase: (phase) => set({ phase }),
      setHasCode: (hasCode) =>
        set((state) => ({
          discoveryFilters: {
            ...state.discoveryFilters,
            hasCode,
          },
        })),
      setRadiusMeters: (radiusMeters) =>
        set((state) => ({
          discoveryFilters: {
            ...state.discoveryFilters,
            radiusMeters,
          },
        })),
      resetDiscoveryFilters: () =>
        set({
          discoveryFilters: DEFAULT_SEARCH_DISCOVERY_FILTERS,
        }),
    }),
    {
      name: '@peedom/search-discovery',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        discoveryFilters: state.discoveryFilters,
      }),
    }
  )
);

export const selectHasActiveSearchDiscoveryFilters = (state: SearchStoreState): boolean =>
  state.discoveryFilters.hasCode !== DEFAULT_SEARCH_DISCOVERY_FILTERS.hasCode ||
  state.discoveryFilters.radiusMeters !== DEFAULT_SEARCH_DISCOVERY_FILTERS.radiusMeters;
