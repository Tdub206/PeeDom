import type { AccessibilityFeatures, HoursData } from '@/types';
import type {
  ImportedPublicBathroomParseResult,
  ImportedPublicBathroomRecord,
  JsonObject,
  PublicImportSkipReason,
} from './public-restroom-import';

type OverpassElementType = 'node' | 'way' | 'relation';

interface OverpassTags {
  [key: string]: string | undefined;
}

export interface OverpassElement {
  type: OverpassElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: OverpassTags;
  timestamp?: string;
}

export interface OverpassResponse {
  elements: OverpassElement[];
  osm3s?: {
    timestamp_osm_base?: string;
  };
}

export interface OsmOverpassParseOptions {
  stateCode: string;
  stateName: string;
  includeExpandedTextMatches?: boolean;
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

const DAY_SEQUENCE = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const OSM_DAY_TO_KEY: Record<(typeof DAY_SEQUENCE)[number], string> = {
  Mo: 'monday',
  Tu: 'tuesday',
  We: 'wednesday',
  Th: 'thursday',
  Fr: 'friday',
  Sa: 'saturday',
  Su: 'sunday',
};

const EXPANDED_NAME_MATCH = /\b(restroom|bathroom|washroom|lavatory|comfort station)\b/i;
const ACCESS_BLOCKLIST = new Set(['no', 'private']);
const CLOSED_VALUE_SET = new Set(['disused', 'abandoned', 'closed']);
const KEY_ACCESS_SET = new Set(['key', 'permit', 'members', 'staff']);

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

function normalizeLower(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toLowerCase() : null;
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

function buildDedupeKey(placeName: string, latitude: number, longitude: number): string {
  return `${roundCoordinate(latitude)}:${roundCoordinate(longitude)}:${normalizeName(placeName)}`;
}

function buildDailyHours(open: string, close: string): HoursData {
  return Object.values(OSM_DAY_TO_KEY).reduce<HoursData>((hoursData, day) => {
    hoursData[day] = [{ open, close }];
    return hoursData;
  }, {});
}

function expandDayExpression(expression: string): string[] | null {
  const dayKeys: string[] = [];
  const tokens = expression.split(',').map((token) => token.trim()).filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);

    if (rangeMatch) {
      const startIndex = DAY_SEQUENCE.indexOf(rangeMatch[1] as (typeof DAY_SEQUENCE)[number]);
      const endIndex = DAY_SEQUENCE.indexOf(rangeMatch[2] as (typeof DAY_SEQUENCE)[number]);

      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      if (startIndex <= endIndex) {
        for (let index = startIndex; index <= endIndex; index += 1) {
          dayKeys.push(OSM_DAY_TO_KEY[DAY_SEQUENCE[index]]);
        }
        continue;
      }

      for (let index = startIndex; index < DAY_SEQUENCE.length; index += 1) {
        dayKeys.push(OSM_DAY_TO_KEY[DAY_SEQUENCE[index]]);
      }

      for (let index = 0; index <= endIndex; index += 1) {
        dayKeys.push(OSM_DAY_TO_KEY[DAY_SEQUENCE[index]]);
      }

      continue;
    }

    if (token in OSM_DAY_TO_KEY) {
      dayKeys.push(OSM_DAY_TO_KEY[token as keyof typeof OSM_DAY_TO_KEY]);
      continue;
    }

    return null;
  }

  return dayKeys;
}

export function parseOsmOpeningHours(rawHours: string | null | undefined): {
  hours: HoursData | null;
  ambiguous: boolean;
} {
  const normalizedHours = cleanText(rawHours);

  if (!normalizedHours) {
    return {
      hours: null,
      ambiguous: false,
    };
  }

  if (normalizedHours === '24/7') {
    return {
      hours: buildDailyHours('00:00', '23:59'),
      ambiguous: false,
    };
  }

  const parts = normalizedHours
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      hours: null,
      ambiguous: false,
    };
  }

  const hoursData: HoursData = {};

  for (const part of parts) {
    if (/sunrise|sunset|PH|SH|variable|unknown/i.test(part)) {
      return { hours: null, ambiguous: true };
    }

    const closedMatch = part.match(/^(.+?)\s+(?:off|closed)$/i);

    if (closedMatch) {
      const closedDays = expandDayExpression(closedMatch[1]?.trim() ?? '');

      if (!closedDays) {
        return { hours: null, ambiguous: true };
      }

      for (const day of closedDays) {
        hoursData[day] = [];
      }

      continue;
    }

    const openMatch = part.match(/^(.+?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

    if (!openMatch) {
      return { hours: null, ambiguous: true };
    }

    const days = expandDayExpression(openMatch[1]?.trim() ?? '');

    if (!days) {
      return { hours: null, ambiguous: true };
    }

    for (const day of days) {
      hoursData[day] = [{ open: openMatch[2], close: openMatch[3] }];
    }
  }

  return {
    hours: Object.keys(hoursData).length > 0 ? hoursData : null,
    ambiguous: false,
  };
}

function parseOverpassResponse(raw: string): OverpassResponse {
  const parsed = JSON.parse(raw) as Partial<OverpassResponse>;

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.elements)) {
    throw new Error('Expected an Overpass JSON payload with an elements array.');
  }

  return {
    elements: parsed.elements as OverpassElement[],
    osm3s: parsed.osm3s,
  };
}

function getCoordinates(element: OverpassElement): { latitude: number; longitude: number } | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (typeof element.center?.lat === 'number' && typeof element.center?.lon === 'number') {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function hasExpandedNameMatch(tags: OverpassTags): boolean {
  const candidateValues = [
    tags.name,
    tags.alt_name,
    tags.official_name,
    tags.short_name,
    tags.description,
  ];

  return candidateValues.some((value) => {
    const cleanedValue = cleanText(value);
    return cleanedValue ? EXPANDED_NAME_MATCH.test(cleanedValue) : false;
  });
}

function resolveMatchStrategy(
  tags: OverpassTags,
  options: OsmOverpassParseOptions
): 'canonical_amenity' | 'building_toilets' | 'expanded_name_search' | null {
  if (normalizeLower(tags.amenity) === 'toilets') {
    return 'canonical_amenity';
  }

  if (normalizeLower(tags.building) === 'toilets') {
    return 'building_toilets';
  }

  if (options.includeExpandedTextMatches === true && hasExpandedNameMatch(tags)) {
    return 'expanded_name_search';
  }

  return null;
}

function isExplicitlyClosed(tags: OverpassTags): boolean {
  const lifecycleValues = [
    normalizeLower(tags.disused),
    normalizeLower(tags.abandoned),
    normalizeLower(tags.status),
    normalizeLower(tags.fixme),
  ];

  if (lifecycleValues.some((value) => (value ? CLOSED_VALUE_SET.has(value) : false))) {
    return true;
  }

  const disusedAmenity = normalizeLower(tags['disused:amenity']);
  const abandonedAmenity = normalizeLower(tags['abandoned:amenity']);

  return disusedAmenity === 'toilets' || abandonedAmenity === 'toilets';
}

function isExplicitlyPrivate(tags: OverpassTags): boolean {
  const accessValues = [
    normalizeLower(tags.access),
    normalizeLower(tags['toilets:access']),
  ];

  return accessValues.some((value) => (value ? ACCESS_BLOCKLIST.has(value) : false));
}

function inferAccess(
  tags: OverpassTags
): Pick<ImportedPublicBathroomRecord, 'access_type' | 'is_locked' | 'is_customer_only'> {
  const accessValue = normalizeLower(tags.access) ?? normalizeLower(tags['toilets:access']);
  const lockedValue = normalizeLower(tags.locked);

  if (accessValue === 'customers') {
    return {
      access_type: 'purchase_required',
      is_locked: lockedValue === 'yes' ? true : null,
      is_customer_only: true,
    };
  }

  if (accessValue && KEY_ACCESS_SET.has(accessValue)) {
    return {
      access_type: 'key',
      is_locked: true,
      is_customer_only: false,
    };
  }

  return {
    access_type: 'public',
    is_locked: lockedValue === 'yes' ? true : lockedValue === 'no' ? false : null,
    is_customer_only: false,
  };
}

function inferAccessibility(
  tags: OverpassTags
): Pick<ImportedPublicBathroomRecord, 'is_accessible' | 'accessibility_features'> {
  const wheelchairValue = normalizeLower(tags['toilets:wheelchair']) ?? normalizeLower(tags.wheelchair);
  const unisexValue = normalizeLower(tags['toilets:unisex']) ?? normalizeLower(tags.unisex);
  const changingTableValue = normalizeLower(tags.changing_table) ?? normalizeLower(tags['toilets:changing_table']);

  return {
    is_accessible: wheelchairValue === 'yes' ? true : wheelchairValue === 'no' ? false : null,
    accessibility_features: {
      ...DEFAULT_ACCESSIBILITY_FEATURES,
      is_gender_neutral: unisexValue === 'yes',
      has_changing_table: changingTableValue === 'yes',
      notes:
        wheelchairValue === 'limited'
          ? 'OSM marks this restroom as wheelchair-limited.'
          : DEFAULT_ACCESSIBILITY_FEATURES.notes,
    },
  };
}

function inferLocationArchetype(
  tags: OverpassTags,
  placeName: string
): ImportedPublicBathroomRecord['location_archetype'] {
  const normalizedName = normalizeName(placeName);

  if (
    normalizeLower(tags.railway) === 'station' ||
    normalizeLower(tags.public_transport) !== null ||
    normalizedName.includes('station') ||
    normalizedName.includes('transit') ||
    normalizedName.includes('terminal')
  ) {
    return 'transit';
  }

  if (
    normalizeLower(tags.aeroway) === 'terminal' ||
    normalizedName.includes('airport')
  ) {
    return 'airport';
  }

  if (
    normalizeLower(tags.amenity) === 'library' ||
    normalizedName.includes('library')
  ) {
    return 'library';
  }

  if (
    ['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy'].includes(normalizeLower(tags.amenity) ?? '') ||
    normalizedName.includes('medical') ||
    normalizedName.includes('hospital')
  ) {
    return 'medical';
  }

  if (
    ['school', 'college', 'university', 'kindergarten'].includes(normalizeLower(tags.amenity) ?? '') ||
    normalizedName.includes('school') ||
    normalizedName.includes('campus')
  ) {
    return 'campus';
  }

  if (
    ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court'].includes(normalizeLower(tags.amenity) ?? '')
  ) {
    return 'restaurant';
  }

  if (normalizeLower(tags.shop) !== null) {
    return 'store';
  }

  if (normalizedName.includes('mall')) {
    return 'mall';
  }

  if (
    normalizeLower(tags.tourism) === 'hotel' ||
    normalizedName.includes('hotel')
  ) {
    return 'hotel';
  }

  if (
    normalizeLower(tags.leisure) === 'park' ||
    normalizedName.includes('park') ||
    normalizedName.includes('trailhead')
  ) {
    return 'park';
  }

  return 'general';
}

function buildAddressLine1(tags: OverpassTags): string | null {
  const parts = [cleanText(tags['addr:housenumber']), cleanText(tags['addr:street'])].filter(
    (value): value is string => value !== null
  );

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return cleanText(tags['addr:full']);
}

function inferCity(tags: OverpassTags): string | null {
  return (
    cleanText(tags['addr:city']) ??
    cleanText(tags['addr:town']) ??
    cleanText(tags['addr:village']) ??
    cleanText(tags['addr:hamlet']) ??
    cleanText(tags['is_in:city']) ??
    cleanText(tags['addr:place'])
  );
}

function inferPlaceName(
  tags: OverpassTags,
  stateName: string,
  coordinates: { latitude: number; longitude: number }
): string {
  const directName =
    cleanText(tags.name) ??
    cleanText(tags.official_name) ??
    cleanText(tags.alt_name) ??
    cleanText(tags.short_name);

  if (directName) {
    return directName;
  }

  const operator = cleanText(tags.operator);

  if (operator) {
    return `${operator} Restroom`;
  }

  const addressLine = buildAddressLine1(tags);

  if (addressLine) {
    return `Public Restroom at ${addressLine}`;
  }

  return `Public Restroom ${stateName} ${roundCoordinate(coordinates.latitude, 3)}/${roundCoordinate(
    coordinates.longitude,
    3
  )}`;
}

function buildArchetypeMetadata(
  element: OverpassElement,
  tags: OverpassTags,
  matchStrategy: NonNullable<ReturnType<typeof resolveMatchStrategy>>,
  options: OsmOverpassParseOptions,
  rawHours: string | null,
  hoursAmbiguous: boolean
): JsonObject {
  const metadata: JsonObject = {
    import_source: 'osm-overpass-us',
    import_format: 'overpass-json',
    external_source_id: `${element.type}/${element.id}`,
    source_dataset: 'OpenStreetMap Overpass public restrooms',
    source_state_code: options.stateCode,
    source_state_name: options.stateName,
    source_osm_type: element.type,
    source_osm_id: element.id,
    source_timestamp: cleanText(element.timestamp),
    query_match_strategy: matchStrategy,
    opening_hours_text: rawHours,
    hours_ambiguous: hoursAmbiguous,
    amenity: cleanText(tags.amenity),
    building: cleanText(tags.building),
    access: cleanText(tags.access),
    toilets_access: cleanText(tags['toilets:access']),
    fee: cleanText(tags.fee),
    charge: cleanText(tags.charge),
    operator: cleanText(tags.operator),
    website: cleanText(tags.website) ?? cleanText(tags['contact:website']),
    phone: cleanText(tags.phone) ?? cleanText(tags['contact:phone']),
    seasonal: cleanText(tags.seasonal),
    unisex: cleanText(tags.unisex) ?? cleanText(tags['toilets:unisex']),
    wheelchair: cleanText(tags.wheelchair) ?? cleanText(tags['toilets:wheelchair']),
    changing_table: cleanText(tags.changing_table) ?? cleanText(tags['toilets:changing_table']),
    raw_tags: Object.fromEntries(
      Object.entries(tags)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([key, value]) => [key, value])
    ),
  };

  return metadata;
}

export function parseOsmOverpassPublicRestrooms(
  raw: string,
  options: OsmOverpassParseOptions
): ImportedPublicBathroomParseResult {
  const response = parseOverpassResponse(raw);
  const skipCounts = buildEmptySkipCounts();
  const skipped: ImportedPublicBathroomParseResult['skipped'] = [];
  const records: ImportedPublicBathroomRecord[] = [];
  const seenKeys = new Set<string>();
  let ambiguousHoursRecords = 0;
  let parsedHoursRecords = 0;

  for (const element of response.elements) {
    const tags = element.tags ?? {};
    const externalSourceId = `${element.type}/${element.id}`;
    const coordinates = getCoordinates(element);

    if (!coordinates) {
      skipCounts.missing_point_geometry += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: cleanText(tags.name),
        reason: 'missing_point_geometry',
      });
      continue;
    }

    if (isExplicitlyClosed(tags)) {
      skipCounts.not_open += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: cleanText(tags.name),
        reason: 'not_open',
      });
      continue;
    }

    if (isExplicitlyPrivate(tags)) {
      skipCounts.not_public += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: cleanText(tags.name),
        reason: 'not_public',
      });
      continue;
    }

    const matchStrategy = resolveMatchStrategy(tags, options);

    if (!matchStrategy) {
      skipCounts.not_public += 1;
      skipped.push({
        external_source_id: externalSourceId,
        place_name: cleanText(tags.name),
        reason: 'not_public',
      });
      continue;
    }

    const placeName = inferPlaceName(tags, options.stateName, coordinates);
    const { hours, ambiguous } = parseOsmOpeningHours(tags.opening_hours);

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

    const accessibility = inferAccessibility(tags);
    const access = inferAccess(tags);

    records.push({
      dedupe_key: dedupeKey,
      external_source_id: externalSourceId,
      place_name: placeName,
      address_line1: buildAddressLine1(tags),
      city: inferCity(tags),
      state: options.stateCode,
      postal_code: cleanText(tags['addr:postcode']),
      country_code: 'US',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      is_locked: access.is_locked,
      is_accessible: accessibility.is_accessible,
      is_customer_only: access.is_customer_only,
      accessibility_features: accessibility.accessibility_features,
      hours_json: hours,
      source_type: 'imported',
      moderation_status: 'active',
      show_on_free_map: true,
      hours_source: 'manual',
      google_place_id: null,
      access_type: access.access_type,
      location_archetype: inferLocationArchetype(tags, placeName),
      archetype_metadata: buildArchetypeMetadata(
        element,
        tags,
        matchStrategy,
        options,
        cleanText(tags.opening_hours),
        ambiguous
      ),
    });
  }

  return {
    records,
    skipped,
    summary: {
      total_features: response.elements.length,
      included_records: records.length,
      skipped_records: skipped.length,
      ambiguous_hours_records: ambiguousHoursRecords,
      parsed_hours_records: parsedHoursRecords,
      skip_counts: skipCounts,
    },
  };
}
