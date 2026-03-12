import { create } from 'zustand';
import { BathroomFilters } from '@/types';

interface FilterStoreState {
  searchQuery: string;
  filters: BathroomFilters;
  setSearchQuery: (query: string) => void;
  toggleFilter: (filterName: keyof BathroomFilters) => void;
  resetFilters: () => void;
}

const defaultFilters: BathroomFilters = {
  isAccessible: null,
  isLocked: null,
  isCustomerOnly: null,
};

export const useFilterStore = create<FilterStoreState>((set) => ({
  searchQuery: '',
  filters: defaultFilters,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleFilter: (filterName) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [filterName]: state.filters[filterName] ? null : true,
      },
    })),
  resetFilters: () =>
    set({
      filters: defaultFilters,
    }),
}));
