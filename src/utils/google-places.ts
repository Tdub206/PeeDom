import type { Coordinates, GooglePlaceViewport, RegionBounds } from '@/types';

export const GOOGLE_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2;
export const GOOGLE_AUTOCOMPLETE_DEBOUNCE_MS = 350;
// Allow-list of Google Places (New) `types` tags that mark a place as a
// useful destination for a bathroom-finder app. Mirrors the server-side
// filter in `supabase/functions/google-place-autocomplete/index.ts`.
//
// Includes the broad business markers (`establishment`, `point_of_interest`
// — inherited by restaurants, cafes, stores, bars, pharmacies, etc.) plus
// transit hubs and public amenities that carry bathroom demand but are not
// classically "businesses" (airports, libraries, parks, hospitals, etc.).
//
// Pure address / route / locality / postal_code / political / country /
// neighborhood / plus_code predictions never carry any of these tags.
export const GOOGLE_AUTOCOMPLETE_USEFUL_DESTINATION_TYPES: ReadonlySet<string> = new Set([
  // Broad business markers — catches all commercial POIs
  'establishment',
  'point_of_interest',
  // Transit
  'airport',
  'train_station',
  'subway_station',
  'transit_station',
  'bus_station',
  'light_rail_station',
  'ferry_terminal',
  'rest_stop',
  // Public amenities
  'library',
  'hospital',
  'university',
  'school',
  'park',
  'stadium',
  'museum',
  'tourist_attraction',
  'shopping_mall',
  'gas_station',
  'community_center',
  'convention_center',
  'event_venue',
  'visitor_center',
  'gym',
  'campground',
  'rv_park',
  // Entertainment
  'amusement_park',
  'zoo',
  'aquarium',
  'movie_theater',
  // Civic / government
  'city_hall',
  'courthouse',
  'post_office',
  // Places of worship
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
]);
export const GOOGLE_AUTOCOMPLETE_BIAS_RADIUS_METERS = 10_000;

// Backwards-compatible aliases for the previous address-centric naming.
export const GOOGLE_ADDRESS_AUTOCOMPLETE_MIN_QUERY_LENGTH = GOOGLE_AUTOCOMPLETE_MIN_QUERY_LENGTH;
export const GOOGLE_ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = GOOGLE_AUTOCOMPLETE_DEBOUNCE_MS;

export function isGoogleAutocompleteEligibleQuery(query: string): boolean {
  return query.trim().length >= GOOGLE_AUTOCOMPLETE_MIN_QUERY_LENGTH;
}

/**
 * Returns true if the given Places API (New) prediction `types` array marks
 * a useful destination for a bathroom-finder app: any business POI
 * (restaurant, cafe, store, bar, pharmacy, etc. — via the inherited
 * `establishment` / `point_of_interest` tags), plus transit hubs and
 * public amenities (airports, libraries, parks, hospitals, universities,
 * stadiums, museums, etc.) that carry bathroom demand but are not
 * classically businesses.
 *
 * This mirrors the server-side filter in the `google-place-autocomplete`
 * edge function. Pure address / route / locality / postal_code / political
 * / country / neighborhood / plus_code predictions never carry any of the
 * allow-listed tags, so this predicate cleanly excludes them.
 */
export function isUsefulDestinationPrediction(
  types: readonly string[] | null | undefined
): boolean {
  return Array.isArray(types) && types.some((type) => GOOGLE_AUTOCOMPLETE_USEFUL_DESTINATION_TYPES.has(type));
}

export function createGoogleAutocompleteSessionToken(): string {
  return `stallpass_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function buildGoogleAutocompleteBiasRadiusMeters(
  origin: Coordinates | null | undefined
): number | null {
  return origin ? GOOGLE_AUTOCOMPLETE_BIAS_RADIUS_METERS : null;
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
