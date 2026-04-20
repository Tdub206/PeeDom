import type { AccessibilityFeatures, HoursData } from '@/types';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type PublicImportSkipReason =
  | 'missing_point_geometry'
  | 'missing_name'
  | 'not_active_lifecycle'
  | 'not_public'
  | 'not_open';

export interface SeattleParksGeoJsonProperties {
  OBJECTID?: number;
  PARK?: string | null;
  ALT_NAME?: string | null;
  DESCRIPTION?: string | null;
  PMAID?: string | null;
  LOCATION_ID?: string | null;
  AMWOID?: string | null;
  LIFECYCLESTATUSTXT?: string | null;
  OPENTOPUBLIC?: string | null;
  DAILYLOCKSTATUS?: string | null;
  YRCNSTRCTED?: string | null;
  SEASON?: string | null;
  CURRENTSTATUS?: string | null;
  RSNCLOSED?: string | null;
  SEASONCLOSEDATE?: string | null;
  USAGE?: string | null;
  SANICAN?: string | null;
  HOURS?: string | null;
  LOCKEDBY?: string | null;
  WORK_PERFORMED?: string | null;
  LAST_CLEANING_PERFORMED?: string | null;
  LAST_CLEANING_TYPE?: string | null;
  LAST_RECORD_DATE?: string | null;
  POINT_X?: number | null;
  POINT_Y?: number | null;
  LATITUDE?: number | null;
  LONGITUDE?: number | null;
  COUNCIL_DISTRICT?: number | null;
  MAINT_DISTRICT?: string | null;
  RSJI?: string | null;
  LINK_1?: string | null;
  LINK_2?: string | null;
  SDQL?: string | null;
  GLOBALID?: string | null;
  SE_ANNO_CAD_DATA?: string | null;
  CREATED_USER?: string | null;
  CREATED_DATE?: string | null;
  LAST_EDITED_USER?: string | null;
  LAST_EDITED_DATE?: string | null;
}

export interface GeoJsonPointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface SeattleParksGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJsonPointGeometry | null;
  properties: SeattleParksGeoJsonProperties | null;
}

export interface SeattleParksGeoJsonCollection {
  type: 'FeatureCollection';
  features: SeattleParksGeoJsonFeature[];
}

export interface ImportedPublicBathroomRecord {
  dedupe_key: string;
  external_source_id: string;
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
  accessibility_features: AccessibilityFeatures;
  hours_json: HoursData | null;
  source_type: 'imported';
  moderation_status: 'active';
  show_on_free_map: boolean;
  hours_source: 'manual';
  google_place_id: null;
  access_type: 'public' | 'code' | 'purchase_required' | 'key' | 'nfc_future';
  location_archetype:
    | 'general'
    | 'park'
    | 'store'
    | 'restaurant'
    | 'transit'
    | 'event_portable'
    | 'medical'
    | 'campus'
    | 'library'
    | 'mall'
    | 'airport'
    | 'hotel';
  archetype_metadata: JsonObject;
}

export interface ImportedPublicBathroomSkip {
  external_source_id: string;
  place_name: string | null;
  reason: PublicImportSkipReason;
}

export interface ImportedPublicBathroomSummary {
  total_features: number;
  included_records: number;
  skipped_records: number;
  ambiguous_hours_records: number;
  parsed_hours_records: number;
  skip_counts: Record<PublicImportSkipReason, number>;
}

export interface ImportedPublicBathroomParseResult {
  records: ImportedPublicBathroomRecord[];
  skipped: ImportedPublicBathroomSkip[];
  summary: ImportedPublicBathroomSummary;
}

export interface SeattleParksParseOptions {
  includeLimitedUse?: boolean;
}

const DEFAULT_ACCESSIBILITY_FEATURES: AccessibilityFeatures = {
  has_grab_bars: false,
  door_width_inches: null,
  is_automatic_door: false,
  has_changing_table: false,
  is_family_restroom: false,
  is_gender_neutral: false,
  has_audio_cue: false,
  has_braille_signage: false,
  has_wheelchair_ramp: false,
  has_elevator_access: false,
  stall_width_inches: null,
  turning_radius_inches: null,
  notes: null,
  photo_urls: [],
  verification_date: null,
};

const SKIP_REASONS: PublicImportSkipReason[] = [
  'missing_point_geometry',
  'missing_name',
  'not_active_lifecycle',
  'not_public',
  'not_open',
];

function buildEmptySkipCounts(): Record<PublicImportSkipReason, number> {
  return {
    missing_point_geometry: 0,
    missing_name: 0,
    not_active_lifecycle: 0,
    not_public: 0,
    not_open: 0,
  };
}

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function roundCoordinate(value: number, decimals = 5): string {
  return value.toFixed(decimals);
}

function to24HourTime(hoursSegment: string, meridiemSegment: string, minutesSegment?: string): string {
  const hours = Number.parseInt(hoursSegment, 10);
  const minutes = Number.parseInt(minutesSegment ?? '0', 10);
  const normalizedMeridiem = meridiemSegment.toUpperCase();

  let normalizedHours = hours % 12;

  if (normalizedMeridiem === 'PM') {
    normalizedHours += 12;
  }

  return `${normalizedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function buildDailyHours(open: string, close: string): HoursData {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;

  return days.reduce<HoursData>((hoursData, day) => {
    hoursData[day] = [{ open, close }];
    return hoursData;
  }, {});
}

export function parseSeattleParksHours(rawHours: string | null | undefined): {
  hours: HoursData | null;
  ambiguous: boolean;
} {
  const normalizedHours = cleanText(rawHours);

  if (!normalizedHours) {
    return { hours: null, ambiguous: false };
  }

  if (normalizedHours.toUpperCase() === 'PARK HOURS') {
    return { hours: null, ambiguous: true };
  }

  if (normalizedHours.includes('/')) {
    return { hours: null, ambiguous: true };
  }

  const match = normalizedHours.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
  );

  if (!match) {
    return { hours: null, ambiguous: true };
  }

  const [, openHours, openMinutes, openMeridiem, closeHours, closeMinutes, closeMeridiem] = match;
  const open = to24HourTime(openHours, openMeridiem, openMinutes);
  const close = to24HourTime(closeHours, closeMeridiem, closeMinutes);

  return {
    hours: buildDailyHours(open, close),
    ambiguous: false,
  };
}

function getExternalSourceId(feature: SeattleParksGeoJsonFeature): string {
  const properties = feature.properties;

  return (
    cleanText(properties?.AMWOID) ??
    cleanText(properties?.LOCATION_ID) ??
    cleanText(properties?.GLOBALID) ??
    `object-${properties?.OBJECTID ?? feature.id ?? 'unknown'}`
  );
}

function getPlaceName(properties: SeattleParksGeoJsonProperties | null): string | null {
  return (
    cleanText(properties?.ALT_NAME) ??
    cleanText(properties?.DESCRIPTION) ??
    cleanText(properties?.PARK)
  );
}

function getCoordinates(feature: SeattleParksGeoJsonFeature): { latitude: number; longitude: number } | null {
  const geometryCoordinates = feature.geometry?.coordinates;

  if (
    Array.isArray(geometryCoordinates) &&
    typeof geometryCoordinates[0] === 'number' &&
    typeof geometryCoordinates[1] === 'number'
  ) {
    return {
      longitude: geometryCoordinates[0],
      latitude: geometryCoordinates[1],
    };
  }

  const properties = feature.properties;

  if (typeof properties?.LONGITUDE === 'number' && typeof properties?.LATITUDE === 'number') {
    return {
      longitude: properties.LONGITUDE,
      latitude: properties.LATITUDE,
    };
  }

  return null;
}

function buildDedupeKey(placeName: string, latitude: number, longitude: number): string {
  return `${roundCoordinate(latitude)}:${roundCoordinate(longitude)}:${normalizeName(placeName)}`;
}

function shouldIncludeFeature(
  properties: SeattleParksGeoJsonProperties | null,
  options: SeattleParksParseOptions
): PublicImportSkipReason | null {
  if (cleanText(properties?.LIFECYCLESTATUSTXT) !== 'A') {
    return 'not_active_lifecycle';
  }

  if (cleanText(properties?.OPENTOPUBLIC) !== 'YES') {
    return 'not_public';
  }

  const normalizedStatus = cleanText(properties?.CURRENTSTATUS);

  if (normalizedStatus === 'OPEN') {
    return null;
  }

  if (normalizedStatus === 'LIMITED USE' && options.includeLimitedUse === true) {
    return null;
  }

  return 'not_open';
}

function buildArchetypeMetadata(
  properties: SeattleParksGeoJsonProperties,
  externalSourceId: string,
  rawHours: string | null,
  hoursAmbiguous: boolean
): JsonObject {
  return {
    import_source: 'seattle-parks',
    import_format: 'geojson',
    external_source_id: externalSourceId,
    source_dataset: 'Seattle Parks and Recreation Restrooms',
    park_name: cleanText(properties.PARK),
    facility_name: cleanText(properties.ALT_NAME),
    facility_description: cleanText(properties.DESCRIPTION),
    hours_text: rawHours,
    hours_ambiguous: hoursAmbiguous,
    lifecycle_status: cleanText(properties.LIFECYCLESTATUSTXT),
    open_to_public: cleanText(properties.OPENTOPUBLIC),
    current_status: cleanText(properties.CURRENTSTATUS),
    season: cleanText(properties.SEASON),
    usage: cleanText(properties.USAGE),
    reason_closed: cleanText(properties.RSNCLOSED),
    daily_lock_status: cleanText(properties.DAILYLOCKSTATUS),
    locked_by: cleanText(properties.LOCKEDBY),
    district: cleanText(properties.MAINT_DISTRICT),
    council_district: properties.COUNCIL_DISTRICT ?? null,
    rsji_priority: cleanText(properties.RSJI),
    last_record_date: cleanText(properties.LAST_RECORD_DATE),
    sanitized_can_onsite: cleanText(properties.SANICAN),
    source_global_id: cleanText(properties.GLOBALID),
    source_location_id: cleanText(properties.LOCATION_ID),
    source_amwo_id: cleanText(properties.AMWOID),
    source_object_id: properties.OBJECTID ?? null,
    last_edited_at: cleanText(properties.LAST_EDITED_DATE),
  };
}

function parseSeattleParksCollection(raw: string): SeattleParksGeoJsonCollection {
  const parsed = JSON.parse(raw) as Partial<SeattleParksGeoJsonCollection>;

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection.');
  }

  return {
    type: 'FeatureCollection',
    features: parsed.features as SeattleParksGeoJsonFeature[],
  };
}

export function parseNormalizedPublicBathroomImport(raw: string): ImportedPublicBathroomParseResult {
  const parsed = JSON.parse(raw) as Partial<ImportedPublicBathroomParseResult>;

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.records) ||
    !Array.isArray(parsed.skipped) ||
    !parsed.summary ||
    typeof parsed.summary !== 'object'
  ) {
    throw new Error('Expected a normalized public restroom import payload.');
  }

  return parsed as ImportedPublicBathroomParseResult;
}

export function parseSeattleParksGeoJson(
  raw: string,
  options: SeattleParksParseOptions = {}
): ImportedPublicBathroomParseResult {
  const collection = parseSeattleParksCollection(raw);
  const skipCounts = buildEmptySkipCounts();
  const skipped: ImportedPublicBathroomSkip[] = [];
  const records: ImportedPublicBathroomRecord[] = [];
  const seenKeys = new Set<string>();
  let ambiguousHoursRecords = 0;
  let parsedHoursRecords = 0;

  for (const feature of collection.features) {
    const properties = feature.properties;
    const externalSourceId = getExternalSourceId(feature);
    const placeName = getPlaceName(properties);

    if (!placeName) {
      skipCounts.missing_name += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: null,
        reason: 'missing_name',
      });
      continue;
    }

    const coordinates = getCoordinates(feature);

    if (!coordinates) {
      skipCounts.missing_point_geometry += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: placeName,
        reason: 'missing_point_geometry',
      });
      continue;
    }

    const skipReason = shouldIncludeFeature(properties, options);

    if (skipReason) {
      skipCounts[skipReason] += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: placeName,
        reason: skipReason,
      });
      continue;
    }

    const { hours, ambiguous } = parseSeattleParksHours(properties?.HOURS);

    if (ambiguous) {
      ambiguousHoursRecords += 1;
    }

    if (hours) {
      parsedHoursRecords += 1;
    }

    const dedupeKey = buildDedupeKey(placeName, coordinates.latitude, coordinates.longitude);

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);

    records.push({
      dedupe_key: dedupeKey,
      external_source_id: externalSourceId,
      place_name: placeName,
      address_line1: null,
      city: 'Seattle',
      state: 'WA',
      postal_code: null,
      country_code: 'US',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      is_locked: false,
      is_accessible: null,
      is_customer_only: false,
      accessibility_features: DEFAULT_ACCESSIBILITY_FEATURES,
      hours_json: hours,
      source_type: 'imported',
      moderation_status: 'active',
      show_on_free_map: true,
      hours_source: 'manual',
      google_place_id: null,
      access_type: 'public',
      location_archetype: 'park',
      archetype_metadata: buildArchetypeMetadata(
        properties ?? {},
        externalSourceId,
        cleanText(properties?.HOURS),
        ambiguous
      ),
    });
  }

  const normalizedSkipped: ImportedPublicBathroomSkip[] = SKIP_REASONS.flatMap((reason) =>
    skipped.filter((item) => item.reason === reason)
  );

  return {
    records,
    skipped: normalizedSkipped,
    summary: {
      total_features: collection.features.length,
      included_records: records.length,
      skipped_records: normalizedSkipped.length,
      ambiguous_hours_records: ambiguousHoursRecords,
      parsed_hours_records: parsedHoursRecords,
      skip_counts: skipCounts,
    },
  };
}
