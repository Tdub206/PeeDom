import {
  AccessibilityFeatures,
  AccessibilityPreferenceState,
  BathroomConfidenceFlag,
  BathroomConfidenceProfile,
  BathroomConfidenceTone,
  BathroomFilters,
  BathroomListItem,
  BathroomRecommendation,
  BathroomRecommendationScenario,
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
import { getCodeTrustSummary } from '@/lib/code-trust';

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
const FRESH_INFO_WINDOW_DAYS = 3;
const AGING_INFO_WINDOW_DAYS = 14;
const STALE_PHOTO_WINDOW_DAYS = 45;

const DEFAULT_RECOMMENDATION_TITLES: Record<BathroomRecommendationScenario, string> = {
  best_overall: 'Best overall right now',
  closest_guaranteed: 'Closest dependable stop',
  accessible: 'Best accessible option',
  no_code: 'Best no-code option',
};

interface RecommendationScoreOptions {
  scenario?: BathroomRecommendationScenario;
  now?: Date;
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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDaysSinceTimestamp(value: string | null | undefined, now = new Date()): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / (24 * 60 * 60 * 1000)));
}

function formatDaysAgo(days: number | null, label: string): string {
  if (days === null) {
    return `${label}: unavailable`;
  }

  if (days === 0) {
    return `${label}: today`;
  }

  if (days === 1) {
    return `${label}: 1 day`;
  }

  return `${label}: ${days} days`;
}

function getFreshnessState(days: number | null): BathroomConfidenceProfile['freshness_state'] {
  if (days === null) {
    return 'unknown';
  }

  if (days <= FRESH_INFO_WINDOW_DAYS) {
    return 'fresh';
  }

  if (days <= AGING_INFO_WINDOW_DAYS) {
    return 'aging';
  }

  return 'stale';
}

function getFreshnessScore(days: number | null): number {
  if (days === null) {
    return 52;
  }

  if (days <= FRESH_INFO_WINDOW_DAYS) {
    return 96;
  }

  if (days <= AGING_INFO_WINDOW_DAYS) {
    return 72;
  }

  return 38;
}

function getVerificationStrength(
  bathroom: Pick<BathroomListItem, 'verification_badge_type' | 'is_business_location_verified'>
): number {
  if (bathroom.verification_badge_type) {
    return 96;
  }

  if (bathroom.is_business_location_verified) {
    return 82;
  }

  return 48;
}

function getAvailabilityStrength(
  bathroom: Pick<BathroomListItem, 'flags' | 'hours' | 'primary_code_summary'>,
  now: Date
): number {
  const openNow = isBathroomOpenNow(bathroom.hours, now);

  if (bathroom.flags.is_locked === true) {
    if (!bathroom.primary_code_summary.has_code) {
      return 24;
    }

    return openNow === false ? 58 : 74;
  }

  if (openNow === true) {
    return 92;
  }

  if (openNow === false) {
    return 34;
  }

  return 66;
}

function getAccessReliabilityScore(
  bathroom: Pick<BathroomListItem, 'flags' | 'primary_code_summary'>
): number {
  if (bathroom.flags.is_locked === true) {
    if (!bathroom.primary_code_summary.has_code) {
      return 20;
    }

    return clampPercent(bathroom.primary_code_summary.confidence_score ?? 58);
  }

  return 86;
}

function getConflictState(
  approvalRatio: number | null,
  totalVotes: number,
  freshnessState: BathroomConfidenceProfile['freshness_state']
): BathroomConfidenceProfile['conflict_state'] {
  if (freshnessState === 'stale') {
    return 'outdated';
  }

  if (approvalRatio === null || totalVotes < 3) {
    return freshnessState === 'unknown' ? 'unknown' : 'stable';
  }

  if (approvalRatio > 0.3 && approvalRatio < 0.8) {
    return 'conflicting';
  }

  return 'stable';
}

function getRecommendationDistanceScore(distanceMeters?: number): number {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return 40;
  }

  if (distanceMeters <= 100) {
    return 100;
  }

  if (distanceMeters <= 400) {
    return 88;
  }

  if (distanceMeters <= 1000) {
    return 72;
  }

  if (distanceMeters <= 2500) {
    return 54;
  }

  return 32;
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

export function buildBathroomConfidenceProfile(
  bathroom: Pick<
    BathroomListItem,
    | 'accessibility_score'
    | 'cleanliness_avg'
    | 'flags'
    | 'hours'
    | 'is_business_location_verified'
    | 'last_updated_at'
    | 'location_verified_at'
    | 'primary_code_summary'
    | 'sync'
    | 'verification_badge_type'
  >,
  options?: {
    latestPhotoCreatedAt?: string | null;
    now?: Date;
  }
): BathroomConfidenceProfile {
  const now = options?.now ?? new Date();
  const codeTrust = getCodeTrustSummary({
    confidenceScore: bathroom.primary_code_summary.confidence_score,
    downVotes: null,
    lastVerifiedAt: bathroom.primary_code_summary.last_verified_at,
    upVotes: null,
  });
  const infoFreshnessDays = getDaysSinceTimestamp(
    bathroom.primary_code_summary.last_verified_at ?? bathroom.last_updated_at ?? bathroom.location_verified_at,
    now
  );
  const freshnessState = getFreshnessState(infoFreshnessDays);
  const latestPhotoAgeDays = getDaysSinceTimestamp(options?.latestPhotoCreatedAt ?? null, now);
  const accessReliabilityScore = getAccessReliabilityScore(bathroom);
  const availabilityStrength = getAvailabilityStrength(bathroom, now);
  const verificationStrength = getVerificationStrength(bathroom);
  const cleanlinessStrength =
    typeof bathroom.cleanliness_avg === 'number' ? clampPercent((bathroom.cleanliness_avg / 5) * 100) : 58;
  const freshnessStrength = getFreshnessScore(infoFreshnessDays);
  const trustScore = clampPercent(
    accessReliabilityScore * 0.38 +
      availabilityStrength * 0.2 +
      verificationStrength * 0.17 +
      freshnessStrength * 0.15 +
      cleanlinessStrength * 0.1
  );
  const tone: BathroomConfidenceTone =
    trustScore >= 80 ? 'high' : trustScore >= 60 ? 'medium' : 'low';
  const toneLabel =
    tone === 'high' ? 'Decision-ready' : tone === 'medium' ? 'Use with context' : 'Needs caution';
  const openNow = isBathroomOpenNow(bathroom.hours, now);
  const openStateLabel =
    openNow === true
      ? bathroom.flags.is_locked
        ? 'Likely open now with managed access'
        : 'Likely open now'
      : openNow === false
        ? 'Likely closed now'
        : 'Hours uncertain right now';
  const codeReliabilityLabel =
    bathroom.flags.is_locked === true
      ? bathroom.primary_code_summary.has_code
        ? `Code reliability: ${accessReliabilityScore}%`
        : 'Code reliability: no dependable code yet'
      : 'Code reliability: no code required';
  const conflictState = getConflictState(codeTrust.approvalRatio, codeTrust.totalVotes, freshnessState);
  const conflictLabel =
    conflictState === 'conflicting'
      ? 'Conflicting reports detected'
      : conflictState === 'outdated'
        ? 'Community signals are aging out'
        : null;
  const photoEvidenceLabel =
    latestPhotoAgeDays === null
      ? 'No recent photo evidence'
      : latestPhotoAgeDays > STALE_PHOTO_WINDOW_DAYS
        ? `Photo evidence is ${latestPhotoAgeDays} days old`
        : `Photo evidence from ${latestPhotoAgeDays === 0 ? 'today' : `${latestPhotoAgeDays} day${latestPhotoAgeDays === 1 ? '' : 's'} ago`}`;

  const flags: BathroomConfidenceFlag[] = [
    {
      label:
        freshnessState === 'fresh'
          ? 'Verified recently'
          : freshnessState === 'aging'
            ? 'Freshness is holding'
            : freshnessState === 'stale'
              ? 'Info may be stale'
              : 'Freshness unknown',
      tone:
        freshnessState === 'fresh'
          ? 'positive'
          : freshnessState === 'aging'
            ? 'neutral'
            : freshnessState === 'stale'
              ? 'warning'
              : 'neutral',
    },
    {
      label: openStateLabel,
      tone: openNow === true ? 'positive' : openNow === false ? 'critical' : 'neutral',
    },
    {
      label: codeReliabilityLabel,
      tone:
        bathroom.flags.is_locked !== true
          ? 'positive'
          : accessReliabilityScore >= 75
            ? 'positive'
            : accessReliabilityScore >= 50
              ? 'warning'
              : 'critical',
    },
    {
      label:
        bathroom.verification_badge_type || bathroom.is_business_location_verified
          ? 'Owner or StallPass verified'
          : 'Community managed listing',
      tone: bathroom.verification_badge_type || bathroom.is_business_location_verified ? 'positive' : 'neutral',
    },
    {
      label: bathroom.sync.stale ? 'Showing cached data' : formatDaysAgo(infoFreshnessDays, 'Info freshness'),
      tone: bathroom.sync.stale ? 'warning' : freshnessState === 'stale' ? 'warning' : 'neutral',
    },
  ];

  if (conflictLabel) {
    flags.push({
      label: conflictLabel,
      tone: conflictState === 'conflicting' ? 'warning' : 'neutral',
    });
  }

  if (photoEvidenceLabel) {
    flags.push({
      label: photoEvidenceLabel,
      tone: latestPhotoAgeDays !== null && latestPhotoAgeDays > STALE_PHOTO_WINDOW_DAYS ? 'warning' : 'neutral',
    });
  }

  return {
    trust_score: trustScore,
    tone,
    tone_label: toneLabel,
    code_reliability_score: bathroom.flags.is_locked ? accessReliabilityScore : null,
    code_reliability_label: codeReliabilityLabel,
    open_state_label: openStateLabel,
    info_freshness_days: infoFreshnessDays,
    info_freshness_label: formatDaysAgo(infoFreshnessDays, 'Info freshness'),
    freshness_state: freshnessState,
    conflict_state: conflictState,
    conflict_label: conflictLabel,
    photo_evidence_label: photoEvidenceLabel,
    flags,
  };
}

export function calculateBathroomRecommendationScore(
  bathroom: BathroomListItem,
  options?: RecommendationScoreOptions
): number {
  const scenario = options?.scenario ?? 'best_overall';
  const confidenceProfile = buildBathroomConfidenceProfile(bathroom, {
    now: options?.now,
  });
  const distanceScore = getRecommendationDistanceScore(bathroom.distance_meters);
  const openNow = isBathroomOpenNow(bathroom.hours, options?.now);
  const accessibleBonus = bathroom.accessibility_score >= 60 ? 18 : bathroom.accessibility_score >= 30 ? 10 : 0;
  const noCodeBonus = bathroom.flags.is_locked === true ? -18 : 14;
  const customerPenalty = bathroom.flags.is_customer_only ? -12 : 0;
  const cleanlinessBonus =
    typeof bathroom.cleanliness_avg === 'number' ? Math.round((bathroom.cleanliness_avg - 3) * 6) : 0;
  const verificationBonus =
    bathroom.verification_badge_type || bathroom.is_business_location_verified ? 10 : 0;

  let score =
    confidenceProfile.trust_score * 0.45 +
    distanceScore * 0.3 +
    (openNow === true ? 14 : openNow === false ? -18 : 0) +
    noCodeBonus +
    customerPenalty +
    cleanlinessBonus +
    verificationBonus;

  if (scenario === 'closest_guaranteed') {
    score += openNow === true ? 18 : openNow === false ? -24 : 0;
    score += bathroom.flags.is_locked ? -16 : 18;
    score += confidenceProfile.trust_score * 0.18;
  }

  if (scenario === 'accessible') {
    score += accessibleBonus * 2;
    score += bathroom.flags.is_accessible ? 20 : 0;
  }

  if (scenario === 'no_code') {
    score += bathroom.flags.is_locked ? -28 : 24;
    score += bathroom.primary_code_summary.has_code ? 4 : 0;
  }

  return Math.round(score);
}

export function buildBathroomRecommendations(
  bathrooms: BathroomListItem[],
  options?: {
    now?: Date;
  }
): BathroomRecommendation[] {
  const now = options?.now ?? new Date();
  const scenarios: BathroomRecommendationScenario[] = [
    'best_overall',
    'closest_guaranteed',
    'accessible',
    'no_code',
  ];

  return scenarios.map((scenario) => {
    const rankedBathrooms = [...bathrooms]
      .map((bathroom) => ({
        bathroom,
        score: calculateBathroomRecommendationScore(bathroom, {
          scenario,
          now,
        }),
      }))
      .filter(({ bathroom }) => {
        if (scenario === 'accessible') {
          return bathroom.accessibility_score > 0 || bathroom.flags.is_accessible === true;
        }

        if (scenario === 'no_code') {
          return bathroom.flags.is_locked !== true;
        }

        return true;
      })
      .sort((leftResult, rightResult) => rightResult.score - leftResult.score);

    const winner = rankedBathrooms[0] ?? null;
    const confidenceProfile = winner ? buildBathroomConfidenceProfile(winner.bathroom, { now }) : null;
    const rationale =
      confidenceProfile && winner
        ? `${confidenceProfile.open_state_label}. ${confidenceProfile.code_reliability_label}.`
        : scenario === 'accessible'
          ? 'No accessible bathroom matched the current filters nearby.'
          : scenario === 'no_code'
            ? 'No unlocked bathroom matched the current filters nearby.'
            : 'No recommendation available for the current map view.';

    return {
      scenario,
      title: DEFAULT_RECOMMENDATION_TITLES[scenario],
      bathroom: winner?.bathroom ?? null,
      rationale,
      score: winner?.score ?? null,
    };
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

export function buildNearbyBathroomHighlights<
  T extends Pick<BathroomListItem, 'distance_meters' | 'flags' | 'hours'>
>(
  bathrooms: T[],
  options?: {
    lockedLimit?: number;
    targetDate?: Date;
  }
): {
  nearestOpenUnlocked: T | null;
  lockedBathrooms: T[];
} {
  const targetDate = options?.targetDate ?? new Date();
  const lockedLimit = options?.lockedLimit ?? 3;
  const sortedBathrooms = [...bathrooms].sort((leftBathroom, rightBathroom) => {
    const leftDistance =
      typeof leftBathroom.distance_meters === 'number' ? leftBathroom.distance_meters : Number.MAX_SAFE_INTEGER;
    const rightDistance =
      typeof rightBathroom.distance_meters === 'number' ? rightBathroom.distance_meters : Number.MAX_SAFE_INTEGER;

    return leftDistance - rightDistance;
  });

  const nearestOpenUnlocked =
    sortedBathrooms.find(
      (bathroom) =>
        bathroom.flags.is_locked !== true && isBathroomOpenNow(bathroom.hours, targetDate) === true
    ) ?? null;

  const lockedBathrooms = sortedBathrooms
    .filter((bathroom) => bathroom.flags.is_locked === true)
    .slice(0, lockedLimit);

  return {
    nearestOpenUnlocked,
    lockedBathrooms,
  };
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
    last_updated_at: bathroom.updated_at ?? null,
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

  return [...sortedBathrooms].sort((leftBathroom, rightBathroom) => {
    const leftListItem = mapBathroomRowToListItem(leftBathroom, {
      cachedAt: new Date().toISOString(),
      stale: false,
      origin,
    });
    const rightListItem = mapBathroomRowToListItem(rightBathroom, {
      cachedAt: new Date().toISOString(),
      stale: false,
      origin,
    });
    const leftScore = calculateBathroomRecommendationScore(leftListItem, {
      scenario: filters.prioritizeAccessible ? 'accessible' : 'best_overall',
    });
    const rightScore = calculateBathroomRecommendationScore(rightListItem, {
      scenario: filters.prioritizeAccessible ? 'accessible' : 'best_overall',
    });

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const leftDistance =
      typeof leftBathroom.distance_meters === 'number'
        ? leftBathroom.distance_meters
        : leftListItem.distance_meters ?? Number.MAX_SAFE_INTEGER;
    const rightDistance =
      typeof rightBathroom.distance_meters === 'number'
        ? rightBathroom.distance_meters
        : rightListItem.distance_meters ?? Number.MAX_SAFE_INTEGER;

    return leftDistance - rightDistance;
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
