import { BathroomFilters, BathroomListItem, Coordinates, FavoriteItem, RegionBounds, SyncMetadata, type Database } from '@/types';

export type BathroomRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];
export type NearbyBathroomRow = Database['public']['Functions']['get_bathrooms_near']['Returns'][number];
export type BathroomDirectoryRow = BathroomRow | NearbyBathroomRow;

interface MappingOptions {
  cachedAt: string;
  stale: boolean;
  origin?: Coordinates | null;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildBathroomAddress(
  bathroom: Pick<BathroomDirectoryRow, 'address_line1' | 'city' | 'state' | 'postal_code' | 'country_code'>
): string {
  const locationLine = [bathroom.city, bathroom.state].filter(Boolean).join(', ');

  return [bathroom.address_line1, locationLine, bathroom.postal_code, bathroom.country_code]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
}

export function calculateDistanceMeters(origin: Coordinates, destination: Coordinates): number {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return Math.round(2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine)));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function buildSyncMetadata(options: MappingOptions): SyncMetadata {
  return {
    cached_at: options.cachedAt,
    stale: options.stale,
  };
}

export function mapBathroomRowToListItem(
  bathroom: BathroomDirectoryRow,
  options: MappingOptions
): BathroomListItem {
  const origin = options.origin ?? null;
  const computedDistance =
    'distance_meters' in bathroom && typeof bathroom.distance_meters === 'number'
      ? Math.round(bathroom.distance_meters)
      : origin
        ? calculateDistanceMeters(origin, {
            latitude: bathroom.latitude,
            longitude: bathroom.longitude,
          })
        : undefined;

  return {
    id: bathroom.id,
    place_name: bathroom.place_name,
    address: buildBathroomAddress(bathroom),
    coordinates: {
      latitude: bathroom.latitude,
      longitude: bathroom.longitude,
    },
    flags: {
      is_locked: bathroom.is_locked,
      is_accessible: bathroom.is_accessible,
      is_customer_only: bathroom.is_customer_only,
    },
    distance_meters: computedDistance,
    primary_code_summary: {
      has_code: Boolean(bathroom.code_id),
      confidence_score: bathroom.confidence_score ?? null,
      last_verified_at: bathroom.last_verified_at ?? null,
    },
    sync: buildSyncMetadata(options),
  };
}

export function mapBathroomRowToFavoriteItem(
  bathroom: BathroomDirectoryRow,
  favoritedAt: string,
  options: MappingOptions
): FavoriteItem {
  const listItem = mapBathroomRowToListItem(bathroom, options);

  return {
    ...listItem,
    bathroom_id: bathroom.id,
    favorited_at: favoritedAt,
  };
}

export function applyBathroomFilters<T extends Pick<BathroomDirectoryRow, 'is_accessible' | 'is_customer_only' | 'is_locked'>>(
  bathrooms: T[],
  filters: BathroomFilters
): T[] {
  return bathrooms.filter((bathroom) => {
    if (filters.isAccessible && bathroom.is_accessible !== true) {
      return false;
    }

    if (filters.isLocked && bathroom.is_locked !== true) {
      return false;
    }

    if (filters.isCustomerOnly && bathroom.is_customer_only !== true) {
      return false;
    }

    return true;
  });
}

export function hasActiveBathroomFilters(filters: BathroomFilters): boolean {
  return Boolean(filters.isAccessible || filters.isLocked || filters.isCustomerOnly);
}

export function getRegionBounds(region: RegionBounds): {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
} {
  const latitudeDelta = region.latitudeDelta / 2;
  const longitudeDelta = region.longitudeDelta / 2;

  return {
    minLatitude: roundCoordinate(region.latitude - latitudeDelta),
    maxLatitude: roundCoordinate(region.latitude + latitudeDelta),
    minLongitude: roundCoordinate(region.longitude - longitudeDelta),
    maxLongitude: roundCoordinate(region.longitude + longitudeDelta),
  };
}

export function computeRegionRadiusMeters(region: RegionBounds): number {
  return calculateDistanceMeters(
    {
      latitude: region.latitude,
      longitude: region.longitude,
    },
    {
      latitude: region.latitude + region.latitudeDelta / 2,
      longitude: region.longitude + region.longitudeDelta / 2,
    }
  );
}

export function buildBathroomsCacheKey(region: RegionBounds, filters: BathroomFilters): string {
  return [
    storageSafeNumber(region.latitude),
    storageSafeNumber(region.longitude),
    storageSafeNumber(region.latitudeDelta),
    storageSafeNumber(region.longitudeDelta),
    filters.isAccessible ? 'accessible' : 'all-access',
    filters.isLocked ? 'locked' : 'all-lock',
    filters.isCustomerOnly ? 'customers' : 'all-customers',
  ].join(':');
}

export function buildSearchCacheKey(query: string, filters: BathroomFilters, origin: Coordinates | null): string {
  return [
    query.trim().toLowerCase(),
    filters.isAccessible ? 'accessible' : 'all-access',
    filters.isLocked ? 'locked' : 'all-lock',
    filters.isCustomerOnly ? 'customers' : 'all-customers',
    origin ? storageSafeNumber(origin.latitude) : 'no-origin',
    origin ? storageSafeNumber(origin.longitude) : 'no-origin',
  ].join(':');
}

function storageSafeNumber(value: number): string {
  return value.toFixed(3);
}
