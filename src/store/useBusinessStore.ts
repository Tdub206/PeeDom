import { create } from 'zustand';

interface BusinessStoreState {
  selectedBathroomId: string | null;
  isHoursEditorOpen: boolean;
  isCouponEditorOpen: boolean;
  couponEditorBathroomId: string | null;
  selectBathroom: (bathroomId: string | null) => void;
  openHoursEditor: (bathroomId: string) => void;
  closeHoursEditor: () => void;
  openCouponEditor: (bathroomId: string) => void;
  closeCouponEditor: () => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessStoreState>((set) => ({
  selectedBathroomId: null,
  isHoursEditorOpen: false,
  isCouponEditorOpen: false,
  couponEditorBathroomId: null,
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
  openCouponEditor: (bathroomId) =>
    set({
      couponEditorBathroomId: bathroomId,
      isCouponEditorOpen: true,
    }),
  closeCouponEditor: () =>
    set({
      isCouponEditorOpen: false,
      couponEditorBathroomId: null,
    }),
  reset: () =>
    set({
      selectedBathroomId: null,
      isHoursEditorOpen: false,
      isCouponEditorOpen: false,
      couponEditorBathroomId: null,
    }),
}));
