import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomsNearRegion } from '@/api/bathrooms';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { hasActivePremium } from '@/lib/gamification';
import type { BathroomFilters, BathroomListItem, Coordinates, RegionBounds } from '@/types';
import {
  buildNearbyBathroomHighlights,
  isBathroomVisibleOnMap,
  mapBathroomRowToListItem,
} from '@/utils/bathroom';

const DEFAULT_RADIUS_METERS = 2500;
const DEFAULT_LOCKED_LIMIT = 2;

function buildNearbyRegion(origin: Coordinates, radiusMeters: number): RegionBounds {
  const latitudeDelta = (radiusMeters / 111320) * 2;
  const longitudeDivisor = Math.max(Math.cos((origin.latitude * Math.PI) / 180), 0.1);
  const longitudeDelta = (radiusMeters / (111320 * longitudeDivisor)) * 2;

  return {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export interface NearbyBathroomsResult {
  items: BathroomListItem[];
  nearestOpenUnlocked: BathroomListItem | null;
  lockedBathrooms: BathroomListItem[];
}

interface UseNearbyBathroomsOptions {
  filters: BathroomFilters;
  enabled?: boolean;
  radiusMeters?: number;
  lockedLimit?: number;
}

export function useNearbyBathrooms({
  filters,
  enabled = true,
  radiusMeters = DEFAULT_RADIUS_METERS,
  lockedLimit = DEFAULT_LOCKED_LIMIT,
}: UseNearbyBathroomsOptions) {
  const { profile } = useAuth();
  const {
    coordinates,
    error_message,
    is_refreshing,
    permission_status,
    requestPermission,
    refreshLocation,
  } = useLocation();
  const isPremiumViewer = hasActivePremium(profile);
  const nearbyRegion = useMemo(
    () => (coordinates ? buildNearbyRegion(coordinates, radiusMeters) : null),
    [coordinates, radiusMeters]
  );

  const query = useQuery<NearbyBathroomsResult, Error>({
    queryKey: [
      'nearby-bathrooms',
      coordinates?.latitude ?? null,
      coordinates?.longitude ?? null,
      radiusMeters,
      lockedLimit,
      isPremiumViewer,
      filters,
    ],
    enabled: enabled && permission_status === 'granted' && Boolean(nearbyRegion) && Boolean(coordinates),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!nearbyRegion || !coordinates) {
        throw new Error('Location is required to load nearby bathrooms.');
      }

      const result = await fetchBathroomsNearRegion({
        region: nearbyRegion,
        filters,
      });

      if (result.error) {
        throw result.error;
      }

      const cachedAt = new Date().toISOString();
      const items = result.data
        .map((bathroom) =>
          mapBathroomRowToListItem(bathroom, {
            cachedAt,
            stale: false,
            origin: coordinates,
          })
        )
        .filter((bathroom) => isBathroomVisibleOnMap(bathroom, isPremiumViewer));

      const highlights = buildNearbyBathroomHighlights(items, {
        lockedLimit,
      });

      return {
        items,
        nearestOpenUnlocked: highlights.nearestOpenUnlocked,
        lockedBathrooms: highlights.lockedBathrooms,
      };
    },
  });

  return {
    ...query,
    coordinates,
    error_message,
    is_refreshing,
    permission_status,
    requestPermission,
    refreshLocation,
  };
}
