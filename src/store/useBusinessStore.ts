import { create } from 'zustand';

interface BusinessStoreState {
  selectedBathroomId: string | null;
  isHoursEditorOpen: boolean;
  selectBathroom: (bathroomId: string | null) => void;
  openHoursEditor: (bathroomId: string) => void;
  closeHoursEditor: () => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessStoreState>((set) => ({
  selectedBathroomId: null,
  isHoursEditorOpen: false,
  selectBathroom: (selectedBathroomId) => set({ selectedBathroomId }),
  openHoursEditor: (bathroomId) =>
    set({
      selectedBathroomId: bathroomId,
      isHoursEditorOpen: true,
    }),
  closeHoursEditor: () =>
    set({
      isHoursEditorOpen: false,
    }),
  reset: () =>
    set({
      selectedBathroomId: null,
      isHoursEditorOpen: false,
    }),
}));
