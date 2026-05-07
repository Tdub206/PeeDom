import {
  parseArcGisRestroomGeoJson,
  type ArcGisRestroomParseContext,
} from './arcgis-public-restrooms';
import type {
  ImportedPublicBathroomParseResult,
  JsonObject,
  PublicImportSkipReason,
} from './public-restroom-import';

export interface GovernmentGeoJsonParseContext {
  sourceKey: string;
  portalKey: string;
  portalName: string;
  portalUrl: string;
  queryMatchStrategy: string;
  sourceDatasetId: string;
  sourceDataset: string;
  sourceDatasetUrl: string | null;
  sourceOwner: string | null;
  sourceProvider: string | null;
  sourceResourceId: string;
  sourceResourceName: string;
  sourceResourceUrl: string | null;
  sourceResourceDownloadUrl: string | null;
  sourceAttributionText: string | null;
  sourceLicenseText: string | null;
  sourceLicenseKey: string | null;
  sourceDescription: string | null;
  sourceResourceDescription: string | null;
  sourceUpdatedAt: string | null;
  importFormat?: string;
  countryCode?: string;
  websiteUrl?: string | null;
  extraMetadata?: JsonObject;
}

export interface FetchRetryOptions {
  retries?: number;
  delayMs?: number;
  init?: RequestInit;
}

const DEFAULT_FETCH_RETRIES = 2;
const DEFAULT_FETCH_DELAY_MS = 250;
const SKIP_REASONS: PublicImportSkipReason[] = [
  'missing_point_geometry',
  'missing_name',
  'not_restroom',
  'not_active_lifecycle',
  'not_public',
  'not_open',
];

function asJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function buildSourceDatasetExternalId(context: GovernmentGeoJsonParseContext): string {
  return `${context.portalKey}:${context.sourceDatasetId}`;
}

function buildSourceUrl(context: GovernmentGeoJsonParseContext): string | null {
  return (
    context.sourceDatasetUrl ??
    context.sourceResourceDownloadUrl ??
    context.sourceResourceUrl ??
    context.websiteUrl ??
    null
  );
}

function buildSourceWebsite(context: GovernmentGeoJsonParseContext): string | null {
  return (
    context.websiteUrl ??
    context.sourceDatasetUrl ??
    context.sourceResourceDownloadUrl ??
    context.sourceResourceUrl ??
    null
  );
}

function rewriteGovernmentMetadata(
  metadata: JsonObject,
  context: GovernmentGeoJsonParseContext
): JsonObject {
  return {
    ...metadata,
    import_source: context.sourceKey,
    import_format: context.importFormat ?? 'geojson',
    query_match_strategy: context.queryMatchStrategy,
    source_portal_key: context.portalKey,
    source_portal_name: context.portalName,
    source_portal_url: context.portalUrl,
    source_dataset: context.sourceDataset,
    source_dataset_id: context.sourceDatasetId,
    source_item_id: buildSourceDatasetExternalId(context),
    source_item_owner: context.sourceOwner,
    source_provider: context.sourceProvider,
    source_item_url: context.sourceDatasetUrl,
    source_resource_id: context.sourceResourceId,
    source_resource_name: context.sourceResourceName,
    source_layer_id: context.sourceResourceId,
    source_layer_name: context.sourceResourceName,
    source_service_url: context.sourceResourceUrl,
    source_resource_url: context.sourceResourceUrl,
    source_download_url: context.sourceResourceDownloadUrl,
    source_attribution_text: context.sourceAttributionText ?? context.sourceProvider,
    source_license_text: context.sourceLicenseText,
    source_license_key: context.sourceLicenseKey,
    source_description: context.sourceDescription,
    source_layer_description: context.sourceResourceDescription,
    source_resource_description: context.sourceResourceDescription,
    source_updated_at: context.sourceUpdatedAt,
    website: buildSourceWebsite(context),
    source_url: buildSourceUrl(context),
    country_code: context.countryCode ?? 'US',
    ...(context.extraMetadata ?? {}),
  };
}

export function sanitizeRunLabel(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildDefaultRunLabel(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJsonWithRetry<T>(
  requestUrl: string,
  options: FetchRetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? DEFAULT_FETCH_RETRIES;
  const delayMs = options.delayMs ?? DEFAULT_FETCH_DELAY_MS;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(requestUrl, options.init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${requestUrl}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        break;
      }

      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch JSON from ${requestUrl}`);
}

export async function fetchTextWithRetry(
  requestUrl: string,
  options: FetchRetryOptions = {}
): Promise<string> {
  const retries = options.retries ?? DEFAULT_FETCH_RETRIES;
  const delayMs = options.delayMs ?? DEFAULT_FETCH_DELAY_MS;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(requestUrl, options.init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${requestUrl}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        break;
      }

      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch text from ${requestUrl}`);
}

export function mergeImportedPublicBathroomParseResults(
  results: ImportedPublicBathroomParseResult[]
): ImportedPublicBathroomParseResult {
  const records: ImportedPublicBathroomParseResult['records'] = [];
  const skipped: ImportedPublicBathroomParseResult['skipped'] = [];
  const dedupeKeys = new Set<string>();
  const externalIds = new Set<string>();
  const skipCounts: Record<PublicImportSkipReason, number> = {
    missing_point_geometry: 0,
    missing_name: 0,
    not_restroom: 0,
    not_active_lifecycle: 0,
    not_public: 0,
    not_open: 0,
  };
  let totalFeatures = 0;
  let ambiguousHours = 0;
  let parsedHours = 0;

  for (const result of results) {
    totalFeatures += result.summary.total_features;
    ambiguousHours += result.summary.ambiguous_hours_records;
    parsedHours += result.summary.parsed_hours_records;

    for (const reason of SKIP_REASONS) {
      skipCounts[reason] += result.summary.skip_counts[reason] ?? 0;
    }

    skipped.push(...result.skipped);

    for (const record of result.records) {
      const recordKey = `${record.external_source_id}:${record.dedupe_key}`;

      if (
        externalIds.has(record.external_source_id) ||
        dedupeKeys.has(record.dedupe_key) ||
        externalIds.has(recordKey)
      ) {
        continue;
      }

      externalIds.add(record.external_source_id);
      externalIds.add(recordKey);
      dedupeKeys.add(record.dedupe_key);
      records.push(record);
    }
  }

  return {
    records,
    skipped,
    summary: {
      total_features: totalFeatures,
      included_records: records.length,
      skipped_records: skipped.length,
      ambiguous_hours_records: ambiguousHours,
      parsed_hours_records: parsedHours,
      skip_counts: skipCounts,
    },
  };
}

export function parseGovernmentOpenDataGeoJson(
  raw: string,
  context: GovernmentGeoJsonParseContext
): ImportedPublicBathroomParseResult {
  const parseContext: ArcGisRestroomParseContext = {
    sourceItemId: buildSourceDatasetExternalId(context),
    sourceItemTitle: context.sourceDataset,
    sourceItemOwner: context.sourceOwner,
    sourceLayerId: context.sourceResourceId,
    sourceLayerName: context.sourceResourceName,
    sourceServiceUrl:
      context.sourceResourceUrl ??
      context.sourceResourceDownloadUrl ??
      context.sourceDatasetUrl ??
      context.portalUrl,
    sourceItemUrl: context.sourceDatasetUrl,
    sourceAccessInformation: context.sourceAttributionText,
    sourceLicenseInfo: context.sourceLicenseText,
    sourceDescription: context.sourceDescription,
    sourceLayerDescription: context.sourceResourceDescription,
    sourceDownloadUrl: context.sourceResourceDownloadUrl,
    allowDatasetLevelRestroomSignal: true,
  };
  const baseResult = parseArcGisRestroomGeoJson(raw, parseContext);

  return {
    ...baseResult,
    records: baseResult.records.map((record) => ({
      ...record,
      country_code: context.countryCode ?? 'US',
      archetype_metadata: rewriteGovernmentMetadata(
        asJsonObject(record.archetype_metadata),
        context
      ),
    })),
  };
}
