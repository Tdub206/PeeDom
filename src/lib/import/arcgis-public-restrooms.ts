import type { AccessibilityFeatures, HoursData } from '@/types';
import type {
  ImportedPublicBathroomParseResult,
  ImportedPublicBathroomRecord,
  ImportedPublicBathroomSkip,
  JsonObject,
  PublicImportSkipReason,
} from './public-restroom-import';

export interface ArcGisSearchItem {
  id: string;
  title: string;
  type: string;
  access?: string | null;
  url?: string | null;
  owner?: string | null;
  snippet?: string | null;
  description?: string | null;
  tags?: string[] | null;
  typeKeywords?: string[] | null;
  accessInformation?: string | null;
  licenseInfo?: string | null;
  modified?: number;
}

export interface ArcGisLayerField {
  name: string;
  alias?: string | null;
  type?: string | null;
}

export interface ArcGisLayerMetadata {
  id: number;
  name: string;
  description?: string | null;
  geometryType?: string | null;
  displayField?: string | null;
  objectIdField?: string | null;
  fields?: ArcGisLayerField[] | null;
}

export interface ArcGisLayerSampleFeature {
  attributes?: Record<string, unknown> | null;
}

export interface ArcGisLayerScoreInput {
  item: ArcGisSearchItem;
  layer: ArcGisLayerMetadata;
  sampleFeatures: ArcGisLayerSampleFeature[];
}

export interface ArcGisRestroomParseContext {
  sourceItemId: string;
  sourceItemTitle: string;
  sourceItemOwner: string | null;
  sourceLayerId: string | number;
  sourceLayerName: string;
  sourceServiceUrl: string;
  sourceItemUrl: string | null;
  sourceAccessInformation: string | null;
  sourceLicenseInfo: string | null;
  sourceDescription: string | null;
  sourceLayerDescription: string | null;
  sourceDownloadUrl: string | null;
  allowDatasetLevelRestroomSignal?: boolean;
}

interface GeoJsonPointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

interface GeoJsonMultiPointGeometry {
  type: 'MultiPoint';
  coordinates: [number, number][];
}

interface GeoJsonLineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

interface GeoJsonMultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

interface GeoJsonPolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

interface GeoJsonMultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

type GenericGeoJsonGeometry =
  | GeoJsonPointGeometry
  | GeoJsonMultiPointGeometry
  | GeoJsonLineStringGeometry
  | GeoJsonMultiLineStringGeometry
  | GeoJsonPolygonGeometry
  | GeoJsonMultiPolygonGeometry;

interface GenericGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GenericGeoJsonGeometry | null;
  properties?: Record<string, unknown> | null;
}

interface GenericGeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GenericGeoJsonFeature[];
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

const RESTROOM_TERMS = [
  'restroom',
  'restrooms',
  'bathroom',
  'bathrooms',
  'toilet',
  'toilets',
  'comfort station',
  'comfort stations',
  'lavatory',
  'lavatories',
  'washroom',
  'washrooms',
];
const NEGATIVE_DISCOVERY_TERMS = [
  'parcel',
  'parcels',
  'zoning',
  'pump station',
  'stormwater',
  'wastewater',
  'sewer',
  'hydrant',
  'manhole',
  'waterline',
  'assessor',
  'ownership',
  'survey123',
  'stakeholderview',
  'fieldworkerview',
  'form',
  'results',
  'draft',
];
const PUBLIC_FALSE_TERMS = ['private', 'staff', 'employees only', 'employee only', 'no public access', 'closed to public'];
const CUSTOMER_ONLY_TERMS = ['customer', 'customers', 'patron', 'patrons'];
const KEY_ACCESS_TERMS = ['key', 'permit', 'membership', 'members only', 'code'];
const CLOSED_TERMS = ['closed', 'inactive', 'removed', 'demolished', 'out of service', 'not operational'];
const OPEN_TERMS = ['open', 'active', 'available', 'yes', 'public', 'operational'];
const AFFIRMATIVE_TERMS = ['yes', 'y', 'true', '1', 'open', 'active', 'available', 'public'];
const NEGATIVE_TERMS = ['no', 'n', 'false', '0', 'closed', 'inactive', 'private'];
const NAME_FIELD_CANDIDATES = [
  'facilityname',
  'label',
  'name',
  'title',
  'restroomname',
  'restroom',
  'facility',
  'locationname',
  'location',
  'sitename',
  'site',
];
const CONTEXT_NAME_FIELD_CANDIDATES = ['parkname', 'park', 'facilityname', 'facilityaddress', 'location'];
const TYPE_FIELD_CANDIDATES = [
  'type',
  'facilitytype',
  'assettype',
  'category',
  'subtype',
  'amenity',
  'structuretype',
  'buildingtype',
  'restroomtype',
  'locationtype',
];
const STATUS_FIELD_CANDIDATES = [
  'status',
  'currentstatus',
  'operationalstatus',
  'active',
  'isactive',
  'open',
  'isopen',
  'operational',
  'availabilitystatus',
];
const PUBLIC_FIELD_CANDIDATES = [
  'public',
  'ispublic',
  'opentopublic',
  'publicaccess',
  'access',
  'availability',
];
const ACCESSIBILITY_FIELD_CANDIDATES = ['ada', 'accessible', 'wheelchair', 'isaccessible', 'adaaccessible', 'accessibility'];
const ADDRESS_FIELD_CANDIDATES = [
  'address',
  'facilityaddress',
  'streetaddress',
  'siteaddress',
  'addr',
  'address1',
  'locationdescription',
];
const CITY_FIELD_CANDIDATES = ['city', 'municipality', 'town', 'locality'];
const STATE_FIELD_CANDIDATES = ['state', 'st'];
const POSTAL_FIELD_CANDIDATES = ['postal', 'postalcode', 'zipcode', 'zip'];
const LONGITUDE_FIELD_CANDIDATES = ['longitude', 'lon', 'long'];
const LATITUDE_FIELD_CANDIDATES = ['latitude', 'lat'];
const HOURS_FIELD_CANDIDATES = ['hours', 'hoursofoperation', 'operatinghours', 'openhours', 'openinghours'];
const LOCKED_FIELD_CANDIDATES = ['locked', 'islocked', 'dailylockstatus', 'lockstatus'];

function buildEmptySkipCounts(): Record<PublicImportSkipReason, number> {
  return {
    missing_point_geometry: 0,
    missing_name: 0,
    not_restroom: 0,
    not_active_lifecycle: 0,
    not_public: 0,
    not_open: 0,
  };
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringifyScalar(value: unknown): string | null {
  if (typeof value === 'string') {
    return cleanText(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeText(value: unknown): string | null {
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

function containsTerm(text: string | null, terms: string[]): boolean {
  if (!text) {
    return false;
  }

  return terms.some((term) => text.includes(term));
}

function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeLookupKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildFieldLookup(properties: Record<string, unknown> | null | undefined): Map<string, unknown> {
  const lookup = new Map<string, unknown>();

  if (!properties) {
    return lookup;
  }

  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    const normalizedKey = normalizeLookupKey(key);

    lookup.set(lowerKey, value);

    if (normalizedKey.length > 0) {
      lookup.set(normalizedKey, value);
    }
  }

  return lookup;
}

function getFirstLookupValue(lookup: Map<string, unknown>, candidates: string[]): unknown {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeLookupKey(candidate);

    if (lookup.has(candidate)) {
      return lookup.get(candidate);
    }

    if (normalizedCandidate.length > 0 && lookup.has(normalizedCandidate)) {
      return lookup.get(normalizedCandidate);
    }
  }

  return null;
}

function getFirstLookupText(lookup: Map<string, unknown>, candidates: string[]): string | null {
  return cleanText(getFirstLookupValue(lookup, candidates));
}

function parseTruthyBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : null;
  }

  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (AFFIRMATIVE_TERMS.includes(normalized)) {
    return true;
  }

  if (NEGATIVE_TERMS.includes(normalized)) {
    return false;
  }

  return null;
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildDailyHours(open: string, close: string): HoursData {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  return days.reduce<HoursData>((hoursData, day) => {
    hoursData[day] = [{ open, close }];
    return hoursData;
  }, {});
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

function parseSimpleHours(rawHours: string | null | undefined): { hours: HoursData | null; ambiguous: boolean } {
  const normalizedHours = cleanText(rawHours);

  if (!normalizedHours) {
    return { hours: null, ambiguous: false };
  }

  if (normalizedHours.toLowerCase() === '24/7' || normalizedHours.toLowerCase() === '24 hours') {
    return {
      hours: buildDailyHours('00:00', '23:59'),
      ambiguous: false,
    };
  }

  const match = normalizedHours.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
  );

  if (!match) {
    return { hours: null, ambiguous: true };
  }

  const [, openHours, openMinutes, openMeridiem, closeHours, closeMinutes, closeMeridiem] = match;
  return {
    hours: buildDailyHours(
      to24HourTime(openHours, openMeridiem, openMinutes),
      to24HourTime(closeHours, closeMeridiem, closeMinutes)
    ),
    ambiguous: false,
  };
}

function flattenCoordinates(coordinates: unknown, points: Array<[number, number]>): void {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    points.push([coordinates[0], coordinates[1]]);
    return;
  }

  for (const child of coordinates) {
    flattenCoordinates(child, points);
  }
}

function getFeatureCoordinates(geometry: GenericGeoJsonGeometry | null): { longitude: number; latitude: number } | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Point') {
    return {
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
    };
  }

  if (geometry.type === 'MultiPoint' && geometry.coordinates.length > 0) {
    return {
      longitude: geometry.coordinates[0][0],
      latitude: geometry.coordinates[0][1],
    };
  }

  const points: Array<[number, number]> = [];
  flattenCoordinates(geometry.coordinates, points);

  if (points.length === 0) {
    return null;
  }

  let minLongitude = points[0][0];
  let maxLongitude = points[0][0];
  let minLatitude = points[0][1];
  let maxLatitude = points[0][1];

  for (const [longitude, latitude] of points.slice(1)) {
    minLongitude = Math.min(minLongitude, longitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }

  return {
    longitude: (minLongitude + maxLongitude) / 2,
    latitude: (minLatitude + maxLatitude) / 2,
  };
}

function getCoordinatesFromLookup(lookup: Map<string, unknown>): { longitude: number; latitude: number } | null {
  const longitude = parseFiniteNumber(getFirstLookupValue(lookup, LONGITUDE_FIELD_CANDIDATES));
  const latitude = parseFiniteNumber(getFirstLookupValue(lookup, LATITUDE_FIELD_CANDIDATES));

  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return {
    longitude,
    latitude,
  };
}

function inferLocationArchetype(...texts: Array<string | null>): ImportedPublicBathroomRecord['location_archetype'] {
  const searchText = buildSearchText(texts);

  if (searchText.includes('park')) {
    return 'park';
  }

  if (searchText.includes('library')) {
    return 'library';
  }

  if (searchText.includes('airport')) {
    return 'airport';
  }

  if (searchText.includes('transit') || searchText.includes('station') || searchText.includes('trailhead')) {
    return 'transit';
  }

  if (searchText.includes('campus') || searchText.includes('school') || searchText.includes('university')) {
    return 'campus';
  }

  if (searchText.includes('mall') || searchText.includes('shopping')) {
    return 'mall';
  }

  if (searchText.includes('hotel')) {
    return 'hotel';
  }

  if (searchText.includes('medical') || searchText.includes('hospital') || searchText.includes('clinic')) {
    return 'medical';
  }

  return 'general';
}

function inferRestroomPlaceName(
  lookup: Map<string, unknown>,
  typeText: string | null,
  structuralText: string | null
): string | null {
  const directName = getFirstLookupText(lookup, NAME_FIELD_CANDIDATES);
  const restroomSignalText = buildSearchText([typeText, structuralText]);

  if (directName) {
    if (containsTerm(directName.toLowerCase(), RESTROOM_TERMS)) {
      return directName;
    }

    if (containsTerm(restroomSignalText, RESTROOM_TERMS)) {
      return `${directName} Restroom`;
    }
  }

  const contextName = getFirstLookupText(lookup, CONTEXT_NAME_FIELD_CANDIDATES);

  if (contextName && containsTerm(restroomSignalText, RESTROOM_TERMS)) {
    return `Public Restroom at ${contextName}`;
  }

  const addressLine = getFirstLookupText(lookup, ADDRESS_FIELD_CANDIDATES);

  if (addressLine && containsTerm(restroomSignalText, RESTROOM_TERMS)) {
    return `Public Restroom at ${addressLine}`;
  }

  return null;
}

function inferAccessType(accessText: string | null): ImportedPublicBathroomRecord['access_type'] {
  if (!accessText) {
    return 'public';
  }

  const normalizedAccess = accessText.toLowerCase();

  if (containsTerm(normalizedAccess, CUSTOMER_ONLY_TERMS)) {
    return 'purchase_required';
  }

  if (containsTerm(normalizedAccess, KEY_ACCESS_TERMS)) {
    if (normalizedAccess.includes('code')) {
      return 'code';
    }

    return 'key';
  }

  return 'public';
}

function inferPublicAccess(accessText: string | null): boolean {
  if (!accessText) {
    return true;
  }

  const normalizedAccess = accessText.toLowerCase();
  return !containsTerm(normalizedAccess, PUBLIC_FALSE_TERMS);
}

function inferAccessibility(lookup: Map<string, unknown>): boolean | null {
  for (const fieldName of ACCESSIBILITY_FIELD_CANDIDATES) {
    const value = parseTruthyBoolean(lookup.get(fieldName));

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function buildAccessibilityFeatures(isAccessible: boolean | null): AccessibilityFeatures {
  if (isAccessible === null) {
    return DEFAULT_ACCESSIBILITY_FEATURES;
  }

  return {
    ...DEFAULT_ACCESSIBILITY_FEATURES,
    has_wheelchair_ramp: isAccessible,
  };
}

function getSourceObjectId(feature: GenericGeoJsonFeature, lookup: Map<string, unknown>): string {
  const explicitId = stringifyScalar(feature.id);

  if (explicitId) {
    return explicitId;
  }

  const idCandidates = ['objectid', 'globalid', 'facility_id', 'facilityid', 'id', 'gid'];

  for (const fieldName of idCandidates) {
    const value = lookup.get(fieldName);

    if (typeof value === 'number') {
      return String(value);
    }

    const textValue = cleanText(value);

    if (textValue) {
      return textValue;
    }
  }

  return 'unknown';
}

function buildArchetypeMetadata(
  context: ArcGisRestroomParseContext,
  feature: GenericGeoJsonFeature,
  lookup: Map<string, unknown>,
  rawHours: string | null,
  hoursAmbiguous: boolean
): JsonObject {
  const sourceObjectId = getSourceObjectId(feature, lookup);

  return {
    import_source: 'arcgis-open-data',
    import_format: 'geojson',
    query_match_strategy: 'arcgis_portal_search',
    source_dataset: context.sourceItemTitle,
    source_item_id: context.sourceItemId,
    source_item_owner: context.sourceItemOwner,
    source_layer_id: context.sourceLayerId,
    source_layer_name: context.sourceLayerName,
    source_service_url: context.sourceServiceUrl,
    source_item_url: context.sourceItemUrl,
    source_download_url: context.sourceDownloadUrl,
    source_attribution_text: context.sourceAccessInformation,
    source_license_text: context.sourceLicenseInfo,
    source_description: context.sourceDescription,
    source_layer_description: context.sourceLayerDescription,
    source_object_id: sourceObjectId,
    source_feature_id: stringifyScalar(feature.id),
    hours_text: rawHours,
    hours_ambiguous: hoursAmbiguous,
    website: context.sourceItemUrl ?? context.sourceServiceUrl,
    source_url: context.sourceItemUrl ?? context.sourceServiceUrl,
  };
}

function collectSampleText(feature: ArcGisLayerSampleFeature): string {
  const values = Object.values(feature.attributes ?? {})
    .map((value) => cleanText(value))
    .filter((value): value is string => Boolean(value));

  return buildSearchText(values);
}

export function scoreArcGisItemRelevance(item: ArcGisSearchItem): number {
  const titleText = buildSearchText([item.title]);
  const tagText = buildSearchText(item.tags ?? []);
  const contextText = buildSearchText([item.snippet ?? null, item.description ?? null]);
  const typeKeywordText = buildSearchText(item.typeKeywords ?? []);
  let score = 0;

  if (containsTerm(titleText, RESTROOM_TERMS)) {
    score += 8;
  }

  if (containsTerm(tagText, RESTROOM_TERMS)) {
    score += 5;
  }

  if (containsTerm(contextText, RESTROOM_TERMS)) {
    score += 3;
  }

  if (item.access === 'public') {
    score += 1;
  }

  if (item.url?.includes('/FeatureServer')) {
    score += 1;
  }

  if (containsTerm(typeKeywordText, ['survey123', 'stakeholderview', 'fieldworkerview'])) {
    score -= 4;
  }

  if (!containsTerm(titleText, RESTROOM_TERMS) && containsTerm(buildSearchText([titleText, tagText, contextText]), NEGATIVE_DISCOVERY_TERMS)) {
    score -= 3;
  }

  return score;
}

export function hasArcGisStructuralRestroomSignal(item: ArcGisSearchItem, layer: ArcGisLayerMetadata): boolean {
  return hasArcGisItemRestroomSignal(item) || hasArcGisLayerRestroomSignal(layer);
}

export function hasArcGisItemRestroomSignal(item: ArcGisSearchItem): boolean {
  const itemText = buildSearchText([
    item.title,
    item.snippet ?? null,
    item.description ?? null,
    ...(item.tags ?? []),
  ]);

  return containsTerm(itemText, RESTROOM_TERMS);
}

export function hasArcGisLayerRestroomSignal(layer: ArcGisLayerMetadata): boolean {
  const layerText = buildSearchText([
    layer.name,
    layer.description ?? null,
    layer.displayField ?? null,
    ...(layer.fields ?? []).flatMap((field) => [field.name, field.alias ?? null]),
  ]);

  return containsTerm(layerText, RESTROOM_TERMS);
}

export function scoreArcGisLayerRelevance(input: ArcGisLayerScoreInput): number {
  const layerText = buildSearchText([
    input.layer.name,
    input.layer.description ?? null,
    input.layer.displayField ?? null,
  ]);
  const fieldText = buildSearchText(
    (input.layer.fields ?? []).flatMap((field) => [field.name, field.alias ?? null])
  );
  const sampleText = buildSearchText(input.sampleFeatures.map((feature) => collectSampleText(feature)));
  let score = 0;

  if (containsTerm(layerText, RESTROOM_TERMS)) {
    score += 7;
  }

  if (containsTerm(sampleText, RESTROOM_TERMS)) {
    score += 6;
  }

  if (containsTerm(fieldText, ['restroom', 'bathroom', 'toilet'])) {
    score += 2;
  }

  if (containsTerm(buildSearchText([input.item.title, input.item.snippet ?? null]), ['park', 'facility'])) {
    score += 1;
  }

  if (containsTerm(sampleText, NEGATIVE_DISCOVERY_TERMS) && !containsTerm(sampleText, RESTROOM_TERMS)) {
    score -= 3;
  }

  if (input.layer.geometryType === 'esriGeometryPoint' || input.layer.geometryType === 'esriGeometryPolygon') {
    score += 1;
  }

  return score;
}

function parseFeatureSkipReason(
  lookup: Map<string, unknown>,
  featureText: string,
  typeText: string | null,
  structuralText: string,
  allowDatasetLevelRestroomSignal: boolean
): PublicImportSkipReason | null {
  const hasFeatureRestroomSignal = containsTerm(buildSearchText([typeText, featureText]), RESTROOM_TERMS);
  const hasAllowedDatasetRestroomSignal =
    allowDatasetLevelRestroomSignal && containsTerm(structuralText, RESTROOM_TERMS);

  if (!hasFeatureRestroomSignal && !hasAllowedDatasetRestroomSignal) {
    return 'not_restroom';
  }

  const statusText = getFirstLookupText(lookup, STATUS_FIELD_CANDIDATES);

  if (statusText) {
    const normalizedStatus = statusText.toLowerCase();

    if (containsTerm(normalizedStatus, CLOSED_TERMS)) {
      return 'not_open';
    }

    if (!containsTerm(normalizedStatus, OPEN_TERMS) && parseTruthyBoolean(statusText) === false) {
      return 'not_active_lifecycle';
    }
  }

  const accessText = getFirstLookupText(lookup, PUBLIC_FIELD_CANDIDATES);

  if (!inferPublicAccess(accessText)) {
    return 'not_public';
  }

  return null;
}

function parseGeoJsonCollection(raw: string): GenericGeoJsonFeatureCollection {
  const parsed = JSON.parse(raw) as Partial<GenericGeoJsonFeatureCollection>;

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection.');
  }

  return {
    type: 'FeatureCollection',
    features: parsed.features as GenericGeoJsonFeature[],
  };
}

export function parseArcGisRestroomGeoJson(
  raw: string,
  context: ArcGisRestroomParseContext
): ImportedPublicBathroomParseResult {
  const collection = parseGeoJsonCollection(raw);
  const skipCounts = buildEmptySkipCounts();
  const skipped: ImportedPublicBathroomSkip[] = [];
  const records: ImportedPublicBathroomRecord[] = [];
  const seenKeys = new Set<string>();
  let ambiguousHoursRecords = 0;
  let parsedHoursRecords = 0;

  for (const feature of collection.features) {
    const lookup = buildFieldLookup(feature.properties);
    const sourceObjectId = getSourceObjectId(feature, lookup);
    const typeText = getFirstLookupText(lookup, TYPE_FIELD_CANDIDATES);
    const featureText = buildSearchText(
      Object.values(feature.properties ?? {}).map((value) => cleanText(value))
    );
    const structuralText = buildSearchText([
      context.sourceItemTitle,
      context.sourceLayerName,
      context.sourceDescription,
      context.sourceLayerDescription,
    ]);
    const skipReason = parseFeatureSkipReason(
      lookup,
      featureText,
      typeText,
      structuralText,
      context.allowDatasetLevelRestroomSignal === true
    );

    if (skipReason) {
      skipCounts[skipReason] += 1;
      skipped.push({
        external_source_id: `${context.sourceItemId}:${context.sourceLayerId}:${sourceObjectId}`,
        place_name: inferRestroomPlaceName(lookup, typeText, structuralText),
        reason: skipReason,
      });
      continue;
    }

    const coordinates = getCoordinatesFromLookup(lookup) ?? getFeatureCoordinates(feature.geometry);

    if (!coordinates) {
      skipCounts.missing_point_geometry += 1;
      skipped.push({
        external_source_id: `${context.sourceItemId}:${context.sourceLayerId}:${sourceObjectId}`,
        place_name: inferRestroomPlaceName(lookup, typeText, structuralText),
        reason: 'missing_point_geometry',
      });
      continue;
    }

    const placeName = inferRestroomPlaceName(lookup, typeText, structuralText);

    if (!placeName) {
      skipCounts.missing_name += 1;
      skipped.push({
        external_source_id: `${context.sourceItemId}:${context.sourceLayerId}:${sourceObjectId}`,
        place_name: null,
        reason: 'missing_name',
      });
      continue;
    }

    const rawHours = getFirstLookupText(lookup, HOURS_FIELD_CANDIDATES);
    const { hours, ambiguous } = parseSimpleHours(rawHours);

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

    const accessText = getFirstLookupText(lookup, PUBLIC_FIELD_CANDIDATES);
    const isAccessible = inferAccessibility(lookup);
    const accessType = inferAccessType(accessText);
    const lockText = getFirstLookupText(lookup, LOCKED_FIELD_CANDIDATES);
    const isLocked = parseTruthyBoolean(lockText);
    const city = getFirstLookupText(lookup, CITY_FIELD_CANDIDATES);
    const state = getFirstLookupText(lookup, STATE_FIELD_CANDIDATES);
    const postalCode = getFirstLookupText(lookup, POSTAL_FIELD_CANDIDATES);

    records.push({
      dedupe_key: dedupeKey,
      external_source_id: `${context.sourceItemId}:${context.sourceLayerId}:${sourceObjectId}`,
      place_name: placeName,
      address_line1: getFirstLookupText(lookup, ADDRESS_FIELD_CANDIDATES),
      city,
      state,
      postal_code: postalCode,
      country_code: 'US',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      is_locked: isLocked,
      is_accessible: isAccessible,
      is_customer_only: accessType === 'purchase_required',
      accessibility_features: buildAccessibilityFeatures(isAccessible),
      hours_json: hours,
      source_type: 'imported',
      moderation_status: 'active',
      show_on_free_map: true,
      hours_source: 'manual',
      google_place_id: null,
      access_type: accessType,
      location_archetype: inferLocationArchetype(
        context.sourceItemTitle,
        context.sourceLayerName,
        placeName,
        typeText,
        getFirstLookupText(lookup, CONTEXT_NAME_FIELD_CANDIDATES)
      ),
      archetype_metadata: buildArchetypeMetadata(context, feature, lookup, rawHours, ambiguous),
    });
  }

  return {
    records,
    skipped,
    summary: {
      total_features: collection.features.length,
      included_records: records.length,
      skipped_records: skipped.length,
      ambiguous_hours_records: ambiguousHoursRecords,
      parsed_hours_records: parsedHoursRecords,
      skip_counts: skipCounts,
    },
  };
}
