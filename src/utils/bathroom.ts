import {
  AccessibilityFeatures,
  AccessibilityPreferenceState,
  BathroomFilters,
  BathroomListItem,
  Coordinates,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  DEFAULT_ACCESSIBILITY_FEATURES,
  FavoriteItem,
  HoursData,
  RegionBounds,
  StallPassAccessTier,
  SyncMetadata,
  type Database,
} from '@/types';

type BathroomAccessibilityFeaturesInput =
  | AccessibilityFeatures
  | Database['public']['Views']['v_bathroom_detail_public']['Row']['accessibility_features']
  | null;

interface BathroomDirectoryRowBase {
  id: string;
  place_name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string;
  latitude: number;
  longitude: number;
  is_locked: boolean | null;
  is_accessible: boolean | null;
  is_customer_only: boolean;
  accessibility_features: BathroomAccessibilityFeaturesInput;
  accessibility_score?: number | null;
  hours_json: Database['public']['Views']['v_bathroom_detail_public']['Row']['hours_json'];
  code_id: string | null;
  confidence_score: number | null;
  up_votes: number | null;
  down_votes: number | null;
  last_verified_at: string | null;
  expires_at: string | null;
  cleanliness_avg: number | null;
  updated_at: string;
  distance_meters?: number | null;
  rank?: number;
  favorited_at?: string;
  verification_badge_type?: string | null;
  stallpass_access_tier?: StallPassAccessTier;
  show_on_free_map?: boolean;
  is_business_location_verified?: boolean;
  location_verified_at?: string | null;
  active_offer_count?: number;
}

export type BathroomRow = BathroomDirectoryRowBase;
export type NearbyBathroomRow = BathroomDirectoryRowBase & { distance_meters: number };
export type SearchBathroomRow = BathroomDirectoryRowBase & { distance_meters: number | null; rank: number };
export type FavoriteBathroomRow = BathroomDirectoryRowBase & { distance_meters: number | null; favorited_at: string };
export type BathroomDirectoryRow = BathroomDirectoryRowBase;

type HoursEntry = {
  open: string;
  close: string;
};

export type BathroomMapPinTone = 'open_unlocked' | 'locked_with_code' | 'locked_without_code' | 'unknown_hours';

interface MappingOptions {
  cachedAt: string;
  stale: boolean;
  origin?: Coordinates | null;
}

const RECENT_VERIFICATION_WINDOW_DAYS = 14;

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

export function normalizeAccessibilityFeatures(
  accessibilityFeatures: BathroomDirectoryRow['accessibility_features']
): AccessibilityFeatures {
  if (!accessibilityFeatures || typeof accessibilityFeatures !== 'object' || Array.isArray(accessibilityFeatures)) {
    return DEFAULT_ACCESSIBILITY_FEATURES;
  }

  const rawPhotoUrls = accessibilityFeatures.photo_urls;

  return {
    has_grab_bars: accessibilityFeatures.has_grab_bars === true,
    door_width_inches:
      typeof accessibilityFeatures.door_width_inches === 'number'
        ? accessibilityFeatures.door_width_inches
        : null,
    is_automatic_door: accessibilityFeatures.is_automatic_door === true,
    has_changing_table: accessibilityFeatures.has_changing_table === true,
    is_family_restroom: accessibilityFeatures.is_family_restroom === true,
    is_gender_neutral: accessibilityFeatures.is_gender_neutral === true,
    has_audio_cue: accessibilityFeatures.has_audio_cue === true,
    has_braille_signage: accessibilityFeatures.has_braille_signage === true,
    has_wheelchair_ramp: accessibilityFeatures.has_wheelchair_ramp === true,
    has_elevator_access: accessibilityFeatures.has_elevator_access === true,
    stall_width_inches:
      typeof accessibilityFeatures.stall_width_inches === 'number'
        ? accessibilityFeatures.stall_width_inches
        : null,
    turning_radius_inches:
      typeof accessibilityFeatures.turning_radius_inches === 'number'
        ? accessibilityFeatures.turning_radius_inches
        : null,
    notes: typeof accessibilityFeatures.notes === 'string' ? accessibilityFeatures.notes : null,
    photo_urls: Array.isArray(rawPhotoUrls)
      ? rawPhotoUrls.reduce<string[]>((photoUrls, value) => {
          if (typeof value === 'string') {
            photoUrls.push(value);
          }

          return photoUrls;
        }, [])
      : [],
    verification_date:
      typeof accessibilityFeatures.verification_date === 'string'
        ? accessibilityFeatures.verification_date
        : null,
  };
}

export function calculateAccessibilityScore(
  accessibilityFeatures: AccessibilityFeatures,
  isAccessible: boolean | null | undefined
): number {
  const score =
    (isAccessible ? 20 : 0) +
    (accessibilityFeatures.has_grab_bars ? 15 : 0) +
    (accessibilityFeatures.is_automatic_door ? 10 : 0) +
    (accessibilityFeatures.has_wheelchair_ramp ? 10 : 0) +
    (accessibilityFeatures.has_elevator_access ? 10 : 0) +
    (accessibilityFeatures.is_family_restroom ? 10 : 0) +
    (accessibilityFeatures.is_gender_neutral ? 10 : 0) +
    (accessibilityFeatures.has_changing_table ? 10 : 0) +
    (accessibilityFeatures.has_braille_signage ? 5 : 0) +
    (accessibilityFeatures.has_audio_cue ? 5 : 0) +
    ((accessibilityFeatures.door_width_inches ?? 0) >= 32 ? 5 : 0) +
    ((accessibilityFeatures.stall_width_inches ?? 0) >= 60 ? 5 : 0) +
    ((accessibilityFeatures.turning_radius_inches ?? 0) >= 60 ? 5 : 0);

  return Math.min(100, Math.max(0, score));
}

function isBathroomAccessible(
  accessibilityFeatures: AccessibilityFeatures,
  isAccessible: boolean | null | undefined
): boolean {
  return Boolean(isAccessible) || calculateAccessibilityScore(accessibilityFeatures, isAccessible) > 0;
}

export function mergeAccessibilityFilters(
  filters: BathroomFilters,
  isAccessibilityMode: boolean,
  accessibilityPreferences: AccessibilityPreferenceState = DEFAULT_ACCESSIBILITY_PREFERENCES
): BathroomFilters {
  if (!isAccessibilityMode) {
    return filters;
  }

  return {
    ...filters,
    isAccessible: filters.isAccessible || accessibilityPreferences.hideNonAccessible ? true : filters.isAccessible,
    hasChangingTable:
      filters.hasChangingTable || accessibilityPreferences.requireChangingTable ? true : filters.hasChangingTable,
    isFamilyRestroom:
      filters.isFamilyRestroom || accessibilityPreferences.requireFamilyRestroom ? true : filters.isFamilyRestroom,
    requireGrabBars:
      filters.requireGrabBars || accessibilityPreferences.requireGrabBars ? true : filters.requireGrabBars,
    requireAutomaticDoor:
      filters.requireAutomaticDoor || accessibilityPreferences.requireAutomaticDoor
        ? true
        : filters.requireAutomaticDoor,
    requireGenderNeutral:
      filters.requireGenderNeutral || accessibilityPreferences.requireGenderNeutral
        ? true
        : filters.requireGenderNeutral,
    minDoorWidth:
      typeof filters.minDoorWidth === 'number'
        ? filters.minDoorWidth
        : accessibilityPreferences.minDoorWidth,
    minStallWidth:
      typeof filters.minStallWidth === 'number'
        ? filters.minStallWidth
        : accessibilityPreferences.minStallWidth,
    prioritizeAccessible:
      filters.prioritizeAccessible || accessibilityPreferences.prioritizeAccessible
        ? true
        : filters.prioritizeAccessible,
    hideNonAccessible:
      filters.hideNonAccessible || accessibilityPreferences.hideNonAccessible ? true : filters.hideNonAccessible,
  };
}

export function hasRecentlyVerifiedCode(lastVerifiedAt: string | null | undefined): boolean {
  if (!lastVerifiedAt) {
    return false;
  }

  const parsedTimestamp = new Date(lastVerifiedAt).getTime();

  if (Number.isNaN(parsedTimestamp)) {
    return false;
  }

  return parsedTimestamp >= Date.now() - RECENT_VERIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getHoursEntries(hoursJson: BathroomDirectoryRow['hours_json'], targetDate: Date): HoursEntry[] {
  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return [];
  }

  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const candidateKeys = [
    dayName,
    dayName.toLowerCase(),
    dayName.slice(0, 3),
    dayName.slice(0, 3).toLowerCase(),
  ];

  const hoursEntries = candidateKeys.flatMap((candidateKey) => {
    const rawValue = hoursJson[candidateKey];

    if (!Array.isArray(rawValue)) {
      return [];
    }

    return rawValue.filter(
      (entry): entry is HoursEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as HoursEntry).open === 'string' &&
        typeof (entry as HoursEntry).close === 'string'
    );
  });

  return hoursEntries;
}

function toHoursData(hoursJson: BathroomDirectoryRow['hours_json']): HoursData | null {
  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return null;
  }

  const normalizedEntries = Object.entries(hoursJson).reduce<HoursData>((hoursData, [day, rawValue]) => {
    if (!Array.isArray(rawValue)) {
      return hoursData;
    }

    const entries = rawValue.filter(
      (entry): entry is HoursEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as HoursEntry).open === 'string' &&
        typeof (entry as HoursEntry).close === 'string'
    );

    if (!entries.length) {
      return hoursData;
    }

    hoursData[day] = entries;
    return hoursData;
  }, {});

  return Object.keys(normalizedEntries).length > 0 ? normalizedEntries : null;
}

function parseHoursToMinutes(value: string): number | null {
  const [hoursSegment, minutesSegment] = value.split(':');
  const hours = Number.parseInt(hoursSegment ?? '', 10);
  const minutes = Number.parseInt(minutesSegment ?? '', 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isBathroomOpenNow(hoursJson: BathroomDirectoryRow['hours_json'], targetDate = new Date()): boolean | null {
  const hoursEntries = getHoursEntries(hoursJson, targetDate);

  if (!hoursEntries.length) {
    return null;
  }

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  return hoursEntries.some((hoursEntry) => {
    const openMinutes = parseHoursToMinutes(hoursEntry.open);
    const closeMinutes = parseHoursToMinutes(hoursEntry.close);

    if (openMinutes === null || closeMinutes === null) {
      return false;
    }

    if (closeMinutes >= openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    }

    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  });
}

export function getBathroomMapPinTone(bathroom: Pick<BathroomListItem, 'flags' | 'hours' | 'primary_code_summary'>): BathroomMapPinTone {
  if (bathroom.flags.is_locked === true) {
    return bathroom.primary_code_summary.has_code ? 'locked_with_code' : 'locked_without_code';
  }

  const openNow = isBathroomOpenNow(bathroom.hours);

  if (openNow === true) {
    return 'open_unlocked';
  }

  return 'unknown_hours';
}

export function isBathroomVisibleOnMap(
  bathroom: Pick<BathroomListItem, 'stallpass_access_tier' | 'show_on_free_map'>,
  isPremiumViewer: boolean
): boolean {
  return bathroom.stallpass_access_tier !== 'premium' || bathroom.show_on_free_map || isPremiumViewer;
}

export function mapBathroomRowToListItem(
  bathroom: BathroomDirectoryRow,
  options: MappingOptions
): BathroomListItem {
  const accessibilityFeatures = normalizeAccessibilityFeatures(bathroom.accessibility_features);
  const accessibilityScore =
    typeof bathroom.accessibility_score === 'number'
      ? bathroom.accessibility_score
      : calculateAccessibilityScore(accessibilityFeatures, bathroom.is_accessible);
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
    accessibility_features: accessibilityFeatures,
    accessibility_score: accessibilityScore,
    hours: toHoursData(bathroom.hours_json),
    cleanliness_avg: bathroom.cleanliness_avg ?? null,
    distance_meters: computedDistance,
    primary_code_summary: {
      has_code: Boolean(bathroom.code_id),
      confidence_score: bathroom.confidence_score ?? null,
      last_verified_at: bathroom.last_verified_at ?? null,
    },
    verification_badge_type: (bathroom.verification_badge_type as BathroomListItem['verification_badge_type']) ?? null,
    stallpass_access_tier: bathroom.stallpass_access_tier ?? 'public',
    show_on_free_map: bathroom.show_on_free_map ?? true,
    is_business_location_verified: bathroom.is_business_location_verified ?? false,
    location_verified_at: bathroom.location_verified_at ?? null,
    active_offer_count: bathroom.active_offer_count ?? 0,
    sync: buildSyncMetadata(options),
  };
}

export function mapBathroomDetailRowToListItem(
  bathroom: BathroomDirectoryRow,
  options?: { cachedAt?: string; origin?: Coordinates | null }
): BathroomListItem {
  return mapBathroomRowToListItem(bathroom, {
    cachedAt: options?.cachedAt ?? new Date().toISOString(),
    stale: false,
    origin: options?.origin,
  });
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

export function applyBathroomFilters<
  T extends Pick<
    BathroomDirectoryRow,
    | 'is_accessible'
    | 'is_customer_only'
    | 'is_locked'
    | 'hours_json'
    | 'cleanliness_avg'
    | 'last_verified_at'
    | 'accessibility_features'
    | 'accessibility_score'
  >
>(
  bathrooms: T[],
  filters: BathroomFilters
): T[] {
  return bathrooms.filter((bathroom) => {
    const accessibilityFeatures = normalizeAccessibilityFeatures(
      bathroom.accessibility_features as BathroomDirectoryRow['accessibility_features']
    );
    const accessibilityScore =
      typeof bathroom.accessibility_score === 'number'
        ? bathroom.accessibility_score
        : calculateAccessibilityScore(accessibilityFeatures, bathroom.is_accessible);

    if (filters.isAccessible && !isBathroomAccessible(accessibilityFeatures, bathroom.is_accessible)) {
      return false;
    }

    if (filters.isLocked && bathroom.is_locked !== true) {
      return false;
    }

    if (filters.isCustomerOnly && bathroom.is_customer_only !== true) {
      return false;
    }

    if (filters.openNow && isBathroomOpenNow(bathroom.hours_json) !== true) {
      return false;
    }

    if (filters.noCodeRequired && bathroom.is_locked === true) {
      return false;
    }

    if (filters.recentlyVerifiedOnly && !hasRecentlyVerifiedCode(bathroom.last_verified_at)) {
      return false;
    }

    if (filters.hasChangingTable && accessibilityFeatures.has_changing_table !== true) {
      return false;
    }

    if (filters.isFamilyRestroom && accessibilityFeatures.is_family_restroom !== true) {
      return false;
    }

    if (filters.requireGrabBars && accessibilityFeatures.has_grab_bars !== true) {
      return false;
    }

    if (filters.requireAutomaticDoor && accessibilityFeatures.is_automatic_door !== true) {
      return false;
    }

    if (filters.requireGenderNeutral && accessibilityFeatures.is_gender_neutral !== true) {
      return false;
    }

    if (
      typeof filters.minDoorWidth === 'number' &&
      (accessibilityFeatures.door_width_inches ?? 0) < filters.minDoorWidth
    ) {
      return false;
    }

    if (
      typeof filters.minStallWidth === 'number' &&
      (accessibilityFeatures.stall_width_inches ?? 0) < filters.minStallWidth
    ) {
      return false;
    }

    if (filters.hideNonAccessible && accessibilityScore <= 0) {
      return false;
    }

    if (
      typeof filters.minCleanlinessRating === 'number' &&
      (bathroom.cleanliness_avg ?? 0) < filters.minCleanlinessRating
    ) {
      return false;
    }

    return true;
  });
}

export function hasActiveBathroomFilters(filters: BathroomFilters): boolean {
  return Boolean(
    filters.isAccessible ||
      filters.isLocked ||
      filters.isCustomerOnly ||
      filters.openNow ||
      filters.noCodeRequired ||
      filters.recentlyVerifiedOnly ||
      filters.hasChangingTable ||
      filters.isFamilyRestroom ||
      filters.requireGrabBars ||
      filters.requireAutomaticDoor ||
      filters.requireGenderNeutral ||
      filters.prioritizeAccessible ||
      filters.hideNonAccessible ||
      typeof filters.minDoorWidth === 'number' ||
      typeof filters.minStallWidth === 'number' ||
      typeof filters.minCleanlinessRating === 'number'
  );
}

export function sortBathroomsByDistance<T extends BathroomDirectoryRow>(
  bathrooms: T[],
  origin?: Coordinates | null
): T[] {
  if (!origin) {
    return bathrooms;
  }

  return [...bathrooms].sort((leftBathroom, rightBathroom) => {
    const leftDistance =
      'distance_meters' in leftBathroom && typeof leftBathroom.distance_meters === 'number'
        ? leftBathroom.distance_meters
        : calculateDistanceMeters(origin, {
            latitude: leftBathroom.latitude,
            longitude: leftBathroom.longitude,
          });
    const rightDistance =
      'distance_meters' in rightBathroom && typeof rightBathroom.distance_meters === 'number'
        ? rightBathroom.distance_meters
        : calculateDistanceMeters(origin, {
            latitude: rightBathroom.latitude,
            longitude: rightBathroom.longitude,
          });

    return leftDistance - rightDistance;
  });
}

export function sortBathroomsByFilters<T extends BathroomDirectoryRow>(
  bathrooms: T[],
  filters: BathroomFilters,
  origin?: Coordinates | null
): T[] {
  const sortedBathrooms = sortBathroomsByDistance(bathrooms, origin);

  if (!filters.prioritizeAccessible) {
    return sortedBathrooms;
  }

  return [...sortedBathrooms].sort((leftBathroom, rightBathroom) => {
    const leftFeatures = normalizeAccessibilityFeatures(
      leftBathroom.accessibility_features as BathroomDirectoryRow['accessibility_features']
    );
    const rightFeatures = normalizeAccessibilityFeatures(
      rightBathroom.accessibility_features as BathroomDirectoryRow['accessibility_features']
    );
    const leftScore =
      typeof leftBathroom.accessibility_score === 'number'
        ? leftBathroom.accessibility_score
        : calculateAccessibilityScore(leftFeatures, leftBathroom.is_accessible);
    const rightScore =
      typeof rightBathroom.accessibility_score === 'number'
        ? rightBathroom.accessibility_score
        : calculateAccessibilityScore(rightFeatures, rightBathroom.is_accessible);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return 0;
  });
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
    filters.openNow ? 'open-now' : 'all-hours',
    filters.noCodeRequired ? 'no-code' : 'all-access-types',
    filters.recentlyVerifiedOnly ? 'recently-verified' : 'all-verification',
    filters.hasChangingTable ? 'changing-table' : 'all-changing-table',
    filters.isFamilyRestroom ? 'family-restroom' : 'all-family',
    filters.requireGrabBars ? 'grab-bars' : 'all-grab-bars',
    filters.requireAutomaticDoor ? 'automatic-door' : 'all-doors',
    filters.requireGenderNeutral ? 'gender-neutral' : 'all-gender',
    typeof filters.minDoorWidth === 'number' ? `door-${filters.minDoorWidth}` : 'all-door-width',
    typeof filters.minStallWidth === 'number' ? `stall-${filters.minStallWidth}` : 'all-stall-width',
    filters.prioritizeAccessible ? 'accessible-first' : 'default-sort',
    filters.hideNonAccessible ? 'hide-non-accessible' : 'show-all-accessibility',
    typeof filters.minCleanlinessRating === 'number' ? `clean-${filters.minCleanlinessRating}` : 'all-clean',
  ].join(':');
}

export function buildSearchCacheKey(query: string, filters: BathroomFilters, origin: Coordinates | null): string {
  return [
    query.trim().toLowerCase(),
    filters.isAccessible ? 'accessible' : 'all-access',
    filters.isLocked ? 'locked' : 'all-lock',
    filters.isCustomerOnly ? 'customers' : 'all-customers',
    filters.openNow ? 'open-now' : 'all-hours',
    filters.noCodeRequired ? 'no-code' : 'all-access-types',
    filters.recentlyVerifiedOnly ? 'recently-verified' : 'all-verification',
    filters.hasChangingTable ? 'changing-table' : 'all-changing-table',
    filters.isFamilyRestroom ? 'family-restroom' : 'all-family',
    filters.requireGrabBars ? 'grab-bars' : 'all-grab-bars',
    filters.requireAutomaticDoor ? 'automatic-door' : 'all-doors',
    filters.requireGenderNeutral ? 'gender-neutral' : 'all-gender',
    typeof filters.minDoorWidth === 'number' ? `door-${filters.minDoorWidth}` : 'all-door-width',
    typeof filters.minStallWidth === 'number' ? `stall-${filters.minStallWidth}` : 'all-stall-width',
    filters.prioritizeAccessible ? 'accessible-first' : 'default-sort',
    filters.hideNonAccessible ? 'hide-non-accessible' : 'show-all-accessibility',
    typeof filters.minCleanlinessRating === 'number' ? `clean-${filters.minCleanlinessRating}` : 'all-clean',
    origin ? storageSafeNumber(origin.latitude) : 'no-origin',
    origin ? storageSafeNumber(origin.longitude) : 'no-origin',
  ].join(':');
}

function storageSafeNumber(value: number): string {
  return value.toFixed(3);
}
