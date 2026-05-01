import { create } from 'zustand';
import { BathroomFilters } from '@/types';

type ToggleableFilterName =
  | 'isAccessible'
  | 'isLocked'
  | 'isCustomerOnly'
  | 'openNow'
  | 'noCodeRequired'
  | 'recentlyVerifiedOnly'
  | 'hasChangingTable'
  | 'isFamilyRestroom'
  | 'requireGrabBars'
  | 'requireAutomaticDoor'
  | 'requireGenderNeutral'
  | 'prioritizeAccessible'
  | 'hideNonAccessible';

interface FilterStoreState {
  searchQuery: string;
  filters: BathroomFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: BathroomFilters) => void;
  toggleFilter: (filterName: ToggleableFilterName) => void;
  setMinCleanlinessRating: (rating: number | null) => void;
  setMinDoorWidth: (width: number | null) => void;
  setMinStallWidth: (width: number | null) => void;
  resetFilters: () => void;
}

export const defaultFilters: BathroomFilters = {
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
};

export const useFilterStore = create<FilterStoreState>((set) => ({
  searchQuery: '',
  filters: defaultFilters,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilters: (filters) => set({ filters }),
  toggleFilter: (filterName) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [filterName]: state.filters[filterName] ? null : true,
      },
    })),
  setMinCleanlinessRating: (minCleanlinessRating) =>
    set((state) => ({
      filters: {
        ...state.filters,
        minCleanlinessRating,
      },
    })),
  setMinDoorWidth: (minDoorWidth) =>
    set((state) => ({
      filters: {
        ...state.filters,
        minDoorWidth,
      },
    })),
  setMinStallWidth: (minStallWidth) =>
    set((state) => ({
      filters: {
        ...state.filters,
        minStallWidth,
      },
    })),
  resetFilters: () =>
    set({
      filters: defaultFilters,
    }),
}));
