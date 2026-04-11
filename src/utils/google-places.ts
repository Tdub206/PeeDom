import type { Coordinates, GooglePlaceViewport, RegionBounds } from '@/types';

export const GOOGLE_ADDRESS_AUTOCOMPLETE_MIN_QUERY_LENGTH = 3;
export const GOOGLE_ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 350;

const ADDRESS_HINT_PATTERN =
  /(?:\d{1,6}\s+\S+)|(?:,\s*[A-Za-z]{2}\b)|(?:\b\d{5}(?:-\d{4})?\b)|(?:\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|trl|trail|hwy|highway|pkwy|parkway)\b)/i;

function computeLongitudeMetersPerDegree(latitude: number): number {
  const cosine = Math.max(Math.cos((latitude * Math.PI) / 180), 0.1);
  return 111_320 * cosine;
}

export function isAddressLikeSearchQuery(query: string): boolean {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < GOOGLE_ADDRESS_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return false;
  }

  return ADDRESS_HINT_PATTERN.test(trimmedQuery);
}

export function createGoogleAutocompleteSessionToken(): string {
  return `stallpass_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function buildGoogleAutocompleteBiasRadiusMeters(
  region: RegionBounds | null | undefined,
  origin: Coordinates | null | undefined
): number | null {
  if (region) {
    const latitudeRadiusMeters = (Math.abs(region.latitudeDelta) * 111_320) / 2;
    const longitudeRadiusMeters =
      (Math.abs(region.longitudeDelta) * computeLongitudeMetersPerDegree(region.latitude)) / 2;

    return Math.max(2_500, Math.min(25_000, Math.ceil(Math.max(latitudeRadiusMeters, longitudeRadiusMeters))));
  }

  if (origin) {
    return 10_000;
  }

  return null;
}

export function buildRegionFromGoogleViewport(
  viewport: GooglePlaceViewport | null | undefined,
  coordinates: Coordinates
): RegionBounds {
  const low = viewport?.low;
  const high = viewport?.high;

  if (
    !low ||
    !high ||
    !Number.isFinite(low.latitude) ||
    !Number.isFinite(low.longitude) ||
    !Number.isFinite(high.latitude) ||
    !Number.isFinite(high.longitude)
  ) {
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  const latitudeDelta = Math.max(Math.abs(high.latitude - low.latitude) * 1.6, 0.01);
  const longitudeDelta = Math.max(Math.abs(high.longitude - low.longitude) * 1.6, 0.01);

  return {
    latitude: (high.latitude + low.latitude) / 2,
    longitude: (high.longitude + low.longitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
