import { create } from 'zustand';
import { config } from '@/constants/config';
import { Coordinates, RegionBounds } from '@/types';

interface MapStoreState {
  region: RegionBounds;
  activeBathroomId: string | null;
  userLocation: Coordinates | null;
  hasCenteredOnUser: boolean;
  setRegion: (region: RegionBounds) => void;
  setActiveBathroomId: (bathroomId: string | null) => void;
  setUserLocation: (coordinates: Coordinates | null) => void;
  setHasCenteredOnUser: (value: boolean) => void;
  centerOnUser: () => void;
  reset: () => void;
}

const defaultRegion: RegionBounds = {
  ...config.map.defaultRegion,
};

export const useMapStore = create<MapStoreState>((set, get) => ({
  region: defaultRegion,
  activeBathroomId: null,
  userLocation: null,
  hasCenteredOnUser: false,
  setRegion: (region) => set({ region }),
  setActiveBathroomId: (activeBathroomId) => set({ activeBathroomId }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setHasCenteredOnUser: (hasCenteredOnUser) => set({ hasCenteredOnUser }),
  centerOnUser: () => {
    const currentUserLocation = get().userLocation;

    if (!currentUserLocation) {
      return;
    }

    set({
      region: {
        latitude: currentUserLocation.latitude,
        longitude: currentUserLocation.longitude,
        latitudeDelta: defaultRegion.latitudeDelta,
        longitudeDelta: defaultRegion.longitudeDelta,
      },
      hasCenteredOnUser: true,
    });
  },
  reset: () =>
    set({
      region: defaultRegion,
      activeBathroomId: null,
      userLocation: null,
      hasCenteredOnUser: false,
    }),
}));
