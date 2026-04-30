import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImportedPublicBathroomParseResult, PublicImportSkipReason } from '../src/lib/import/public-restroom-import';

const {
  hasArcGisStructuralRestroomSignal,
  hasArcGisLayerRestroomSignal,
  parseArcGisRestroomGeoJson,
  scoreArcGisItemRelevance,
  scoreArcGisLayerRelevance,
} = (await import(
  new URL('../src/lib/import/arcgis-public-restrooms.ts', import.meta.url).href
)) as typeof import('../src/lib/import/arcgis-public-restrooms');

interface CliOptions {
  outputPath: string | null;
  runLabel: string;
  rawDirectory: string | null;
  manifestPath: string | null;
  maxSearchResultsPerQuery: number;
  maxCandidateItems: number;
  maxAcceptedLayers: number;
  searchTerms: string[];
  searchEndpoint: string;
}

interface ArcGisSearchResponse {
  total?: number;
  start?: number;
  num?: number;
  nextStart?: number;
  results?: ArcGisSearchItem[];
}

interface ArcGisSearchItem {
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

interface ArcGisServiceLayerInfo {
  id: number;
  name: string;
  type?: string | null;
  geometryType?: string | null;
}

interface ArcGisServiceMetadata {
  layers?: ArcGisServiceLayerInfo[];
}

interface ArcGisLayerMetadata {
  id: number;
  name: string;
  description?: string | null;
  geometryType?: string | null;
  displayField?: string | null;
  objectIdField?: string | null;
  fields?: Array<{
    name: string;
    alias?: string | null;
    type?: string | null;
  }> | null;
}

interface ArcGisIdsResponse {
  objectIdFieldName?: string;
  objectIds?: number[];
}

interface GenericGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry?: unknown;
}

interface GenericGeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GenericGeoJsonFeature[];
}

interface ArcGisSampleResponse {
  features?: Array<{
    attributes?: Record<string, unknown> | null;
  }>;
}

interface DiscoveredItemRecord {
  item_id: string;
  title: string;
  item_score: number;
  type: string;
  owner: string | null;
  access: string | null;
  url: string | null;
}

interface DownloadedLayerRecord {
  item_id: string;
  title: string;
  layer_id: number;
  layer_name: string;
  layer_score: number;
  service_url: string;
  download_url: string;
  raw_geojson_path: string;
  raw_feature_count: number;
  normalized_included_records: number;
  normalized_skipped_records: number;
}

interface RejectedRecord {
  item_id: string;
  title: string;
  reason: string;
  score: number | null;
  url: string | null;
}

interface ArcGisDiscoveryManifest {
  run_label: string;
  generated_at: string;
  search_endpoint: string;
  search_terms: string[];
  summary: {
    discovered_items: number;
    candidate_items: number;
    accepted_layers: number;
    downloaded_layers: number;
    normalized_records: number;
    skipped_records: number;
  };
  discovered_items: DiscoveredItemRecord[];
  downloaded_layers: DownloadedLayerRecord[];
  rejected_records: RejectedRecord[];
}

const DEFAULT_SEARCH_TERMS = ['public restroom', 'restroom', 'bathroom', 'toilet', 'comfort station'];
const DEFAULT_SEARCH_ENDPOINT = 'https://www.arcgis.com/sharing/rest/search';
const REQUEST_RETRIES = 2;
const FETCH_DELAY_MS = 250;
const FEATURE_DOWNLOAD_CHUNK_SIZE = 500;
const ITEM_SCORE_THRESHOLD = 5;
const LAYER_SCORE_THRESHOLD = 6;
const SKIP_REASONS: PublicImportSkipReason[] = [
  'missing_point_geometry',
  'missing_name',
  'not_restroom',
  'not_active_lifecycle',
  'not_public',
  'not_open',
];

function parseArgs(argv: string[]): CliOptions {
  const runLabel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const options: CliOptions = {
    outputPath: null,
    runLabel,
    rawDirectory: null,
    manifestPath: null,
    maxSearchResultsPerQuery: 100,
    maxCandidateItems: 150,
    maxAcceptedLayers: 40,
    searchTerms: DEFAULT_SEARCH_TERMS,
    searchEndpoint: DEFAULT_SEARCH_ENDPOINT,
  };

  for (const argument of argv.slice(2)) {
    if (argument.startsWith('--output=')) {
      options.outputPath = argument.slice('--output='.length).trim();
      continue;
    }

    if (argument.startsWith('--run-label=')) {
      options.runLabel = argument.slice('--run-label='.length).trim();
      continue;
    }

    if (argument.startsWith('--raw-dir=')) {
      options.rawDirectory = argument.slice('--raw-dir='.length).trim();
      continue;
    }

    if (argument.startsWith('--manifest=')) {
      options.manifestPath = argument.slice('--manifest='.length).trim();
      continue;
    }

    if (argument.startsWith('--max-search-results-per-query=')) {
      options.maxSearchResultsPerQuery = Number.parseInt(
        argument.slice('--max-search-results-per-query='.length).trim(),
        10
      );
      continue;
    }

    if (argument.startsWith('--max-candidate-items=')) {
      options.maxCandidateItems = Number.parseInt(argument.slice('--max-candidate-items='.length).trim(), 10);
      continue;
    }

    if (argument.startsWith('--max-accepted-layers=')) {
      options.maxAcceptedLayers = Number.parseInt(argument.slice('--max-accepted-layers='.length).trim(), 10);
      continue;
    }

    if (argument.startsWith('--terms=')) {
      const parsedTerms = argument
        .slice('--terms='.length)
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (parsedTerms.length > 0) {
        options.searchTerms = parsedTerms;
      }

      continue;
    }

    if (argument.startsWith('--search-endpoint=')) {
      options.searchEndpoint = argument.slice('--search-endpoint='.length).trim();
    }
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDefaultRawDirectory(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'arcgis-open-data', 'runs', runLabel, 'raw');
}

function buildDefaultOutputPath(workspaceRoot: string, runLabel: string): string {
  return path.join(
    workspaceRoot,
    'PublicRestroomData',
    'arcgis-open-data',
    'runs',
    runLabel,
    'normalized',
    'arcgis-open-data.stallpass-import.json'
  );
}

function buildDefaultManifestPath(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'arcgis-open-data', 'runs', runLabel, 'arcgis-open-data.manifest.json');
}

function buildArcGisItemPageUrl(itemId: string): string {
  return `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(itemId)}`;
}

function buildSearchQuery(term: string): string {
  return `${term} AND access:public AND (type:"Feature Service" OR type:"Feature Layer")`;
}

async function fetchJson<T>(requestUrl: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${requestUrl}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === REQUEST_RETRIES) {
        break;
      }

      await sleep(FETCH_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch JSON from ${requestUrl}`);
}

async function fetchText(requestUrl: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${requestUrl}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === REQUEST_RETRIES) {
        break;
      }

      await sleep(FETCH_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch text from ${requestUrl}`);
}

async function searchArcGisItems(
  endpoint: string,
  term: string,
  maxResults: number
): Promise<ArcGisSearchItem[]> {
  const collectedItems: ArcGisSearchItem[] = [];
  let start = 1;

  while (collectedItems.length < maxResults) {
    const pageSize = Math.min(100, maxResults - collectedItems.length);
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.set('q', buildSearchQuery(term));
    requestUrl.searchParams.set('sortField', 'modified');
    requestUrl.searchParams.set('sortOrder', 'desc');
    requestUrl.searchParams.set('num', String(pageSize));
    requestUrl.searchParams.set('start', String(start));
    requestUrl.searchParams.set('f', 'json');

    const response = await fetchJson<ArcGisSearchResponse>(requestUrl.toString());
    const pageItems = response.results ?? [];

    if (pageItems.length === 0) {
      break;
    }

    collectedItems.push(...pageItems);

    if (!response.nextStart || response.nextStart <= start) {
      break;
    }

    start = response.nextStart;
    await sleep(FETCH_DELAY_MS);
  }

  return collectedItems.slice(0, maxResults);
}

function dedupeAndRankItems(items: ArcGisSearchItem[], maxCandidateItems: number): ArcGisSearchItem[] {
  const itemById = new Map<string, ArcGisSearchItem>();

  for (const item of items) {
    if (!item.id || item.access !== 'public' || !item.url?.includes('/FeatureServer')) {
      continue;
    }

    const existingItem = itemById.get(item.id);

    if (!existingItem || (item.modified ?? 0) > (existingItem.modified ?? 0)) {
      itemById.set(item.id, item);
    }
  }

  return Array.from(itemById.values())
    .map((item) => ({
      item,
      score: scoreArcGisItemRelevance(item),
    }))
    .filter((candidate) => candidate.score >= ITEM_SCORE_THRESHOLD)
    .sort((leftItem, rightItem) => rightItem.score - leftItem.score || (rightItem.item.modified ?? 0) - (leftItem.item.modified ?? 0))
    .slice(0, maxCandidateItems)
    .map((candidate) => candidate.item);
}

function getDirectLayerUrl(itemUrl: string): { layerUrl: string; layerId: number } | null {
  const match = itemUrl.match(/^(.*\/FeatureServer\/)(\d+)\/?$/i);

  if (!match) {
    return null;
  }

  return {
    layerUrl: `${match[1]}${match[2]}`,
    layerId: Number.parseInt(match[2], 10),
  };
}

async function resolveLayerUrls(item: ArcGisSearchItem): Promise<string[]> {
  const itemUrl = item.url?.trim();

  if (!itemUrl) {
    return [];
  }

  const directLayer = getDirectLayerUrl(itemUrl);

  if (directLayer) {
    return [directLayer.layerUrl];
  }

  if (!itemUrl.match(/\/FeatureServer\/?$/i)) {
    return [];
  }

  const requestUrl = new URL(itemUrl);
  requestUrl.searchParams.set('f', 'json');
  const metadata = await fetchJson<ArcGisServiceMetadata>(requestUrl.toString());

  return (metadata.layers ?? [])
    .filter((layer) => layer.type === 'Feature Layer')
    .map((layer) => `${itemUrl.replace(/\/$/, '')}/${layer.id}`);
}

async function fetchLayerMetadata(layerUrl: string): Promise<ArcGisLayerMetadata> {
  const requestUrl = new URL(layerUrl);
  requestUrl.searchParams.set('f', 'json');
  return fetchJson<ArcGisLayerMetadata>(requestUrl.toString());
}

async function fetchSampleFeatures(layerUrl: string): Promise<Array<{ attributes?: Record<string, unknown> | null }>> {
  const requestUrl = new URL(`${layerUrl}/query`);
  requestUrl.searchParams.set('where', '1=1');
  requestUrl.searchParams.set('resultRecordCount', '10');
  requestUrl.searchParams.set('outFields', '*');
  requestUrl.searchParams.set('returnGeometry', 'false');
  requestUrl.searchParams.set('f', 'json');
  const response = await fetchJson<ArcGisSampleResponse>(requestUrl.toString());
  return response.features ?? [];
}

async function fetchObjectIds(layerUrl: string): Promise<number[]> {
  const requestUrl = new URL(`${layerUrl}/query`);
  requestUrl.searchParams.set('where', '1=1');
  requestUrl.searchParams.set('returnIdsOnly', 'true');
  requestUrl.searchParams.set('f', 'json');
  const response = await fetchJson<ArcGisIdsResponse>(requestUrl.toString());
  return response.objectIds ?? [];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function downloadLayerGeoJson(layerUrl: string, objectIds: number[]): Promise<GenericGeoJsonFeatureCollection> {
  if (objectIds.length === 0) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  const features: GenericGeoJsonFeature[] = [];

  for (const idChunk of chunkArray(objectIds, FEATURE_DOWNLOAD_CHUNK_SIZE)) {
    const requestUrl = new URL(`${layerUrl}/query`);
    requestUrl.searchParams.set('objectIds', idChunk.join(','));
    requestUrl.searchParams.set('outFields', '*');
    requestUrl.searchParams.set('returnGeometry', 'true');
    requestUrl.searchParams.set('outSR', '4326');
    requestUrl.searchParams.set('f', 'geojson');
    const responseText = await fetchText(requestUrl.toString());
    const responseJson = JSON.parse(responseText) as Partial<GenericGeoJsonFeatureCollection>;

    if (responseJson.type !== 'FeatureCollection' || !Array.isArray(responseJson.features)) {
      throw new Error(`Layer ${layerUrl} returned a non-GeoJSON response.`);
    }

    features.push(...(responseJson.features as GenericGeoJsonFeature[]));
    await sleep(FETCH_DELAY_MS);
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

function mergeParseResults(results: ImportedPublicBathroomParseResult[]): ImportedPublicBathroomParseResult {
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

      if (externalIds.has(record.external_source_id) || dedupeKeys.has(record.dedupe_key) || externalIds.has(recordKey)) {
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

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const rawDirectory = options.rawDirectory ?? buildDefaultRawDirectory(workspaceRoot, options.runLabel);
  const outputPath = options.outputPath ?? buildDefaultOutputPath(workspaceRoot, options.runLabel);
  const manifestPath = options.manifestPath ?? buildDefaultManifestPath(workspaceRoot, options.runLabel);
  const metadataDirectory = path.join(path.dirname(manifestPath), 'metadata');
  const normalizedResults: ImportedPublicBathroomParseResult[] = [];
  const discoveredItems: DiscoveredItemRecord[] = [];
  const downloadedLayers: DownloadedLayerRecord[] = [];
  const rejectedRecords: RejectedRecord[] = [];
  const searchResults: ArcGisSearchItem[] = [];

  await mkdir(rawDirectory, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(metadataDirectory, { recursive: true });

  for (const term of options.searchTerms) {
    console.log(`Searching ArcGIS for "${term}"`);
    const termResults = await searchArcGisItems(options.searchEndpoint, term, options.maxSearchResultsPerQuery);
    searchResults.push(...termResults);
    await sleep(FETCH_DELAY_MS);
  }

  const candidateItems = dedupeAndRankItems(searchResults, options.maxCandidateItems);
  console.log(`Discovered ${searchResults.length} raw ArcGIS item hits; ${candidateItems.length} candidate items survived scoring.`);

  for (const item of candidateItems) {
    const itemScore = scoreArcGisItemRelevance(item);
    discoveredItems.push({
      item_id: item.id,
      title: item.title,
      item_score: itemScore,
      type: item.type,
      owner: item.owner ?? null,
      access: item.access ?? null,
      url: item.url ?? null,
    });
  }

  for (const item of candidateItems) {
    if (downloadedLayers.length >= options.maxAcceptedLayers) {
      break;
    }

    console.log(`Inspecting ${item.title}`);

    let layerUrls: string[];

    try {
      layerUrls = await resolveLayerUrls(item);
    } catch (error) {
      rejectedRecords.push({
        item_id: item.id,
        title: item.title,
        reason: `layer_url_resolution_failed:${error instanceof Error ? error.message : String(error)}`,
        score: scoreArcGisItemRelevance(item),
        url: item.url ?? null,
      });
      continue;
    }

    if (layerUrls.length === 0) {
      rejectedRecords.push({
        item_id: item.id,
        title: item.title,
        reason: 'no_feature_layers',
        score: scoreArcGisItemRelevance(item),
        url: item.url ?? null,
      });
      continue;
    }

    for (const layerUrl of layerUrls) {
      if (downloadedLayers.length >= options.maxAcceptedLayers) {
        break;
      }

      try {
        const [layerMetadata, sampleFeatures] = await Promise.all([
          fetchLayerMetadata(layerUrl),
          fetchSampleFeatures(layerUrl),
        ]);

        const hasStructuralSignal =
          layerUrls.length > 1
            ? hasArcGisLayerRestroomSignal(layerMetadata)
            : hasArcGisStructuralRestroomSignal(item, layerMetadata);

        if (!hasStructuralSignal) {
          rejectedRecords.push({
            item_id: item.id,
            title: `${item.title} / ${layerMetadata.name}`,
            reason: 'missing_structural_restroom_signal',
            score: null,
            url: layerUrl,
          });
          continue;
        }

        const layerScore = scoreArcGisLayerRelevance({
          item,
          layer: layerMetadata,
          sampleFeatures,
        });

        if (layerScore < LAYER_SCORE_THRESHOLD) {
          rejectedRecords.push({
            item_id: item.id,
            title: `${item.title} / ${layerMetadata.name}`,
            reason: 'layer_score_below_threshold',
            score: layerScore,
            url: layerUrl,
          });
          continue;
        }

        const objectIds = await fetchObjectIds(layerUrl);

        if (objectIds.length === 0) {
          rejectedRecords.push({
            item_id: item.id,
            title: `${item.title} / ${layerMetadata.name}`,
            reason: 'empty_layer',
            score: layerScore,
            url: layerUrl,
          });
          continue;
        }

        const rawGeoJson = await downloadLayerGeoJson(layerUrl, objectIds);
        const rawFileName = `${sanitizeFileName(item.title)}-${item.id}-layer-${layerMetadata.id}.geojson`;
        const rawGeoJsonPath = path.join(rawDirectory, rawFileName);
        await writeFile(rawGeoJsonPath, JSON.stringify(rawGeoJson, null, 2));
        await writeFile(
          path.join(metadataDirectory, `${sanitizeFileName(item.title)}-${item.id}-layer-${layerMetadata.id}.json`),
          JSON.stringify({ item, layerMetadata, sampleFeatures }, null, 2)
        );

        const parseResult = parseArcGisRestroomGeoJson(JSON.stringify(rawGeoJson), {
          sourceItemId: item.id,
          sourceItemTitle: item.title,
          sourceItemOwner: item.owner ?? null,
          sourceLayerId: layerMetadata.id,
          sourceLayerName: layerMetadata.name,
          sourceServiceUrl: layerUrl,
          sourceItemUrl: buildArcGisItemPageUrl(item.id),
          sourceAccessInformation: item.accessInformation ?? null,
          sourceLicenseInfo: item.licenseInfo ?? null,
          sourceDescription: item.description ?? null,
          sourceLayerDescription: layerMetadata.description ?? null,
          sourceDownloadUrl: layerUrl,
        });

        normalizedResults.push(parseResult);
        downloadedLayers.push({
          item_id: item.id,
          title: item.title,
          layer_id: layerMetadata.id,
          layer_name: layerMetadata.name,
          layer_score: layerScore,
          service_url: layerUrl,
          download_url: layerUrl,
          raw_geojson_path: rawGeoJsonPath,
          raw_feature_count: rawGeoJson.features.length,
          normalized_included_records: parseResult.summary.included_records,
          normalized_skipped_records: parseResult.summary.skipped_records,
        });

        console.log(
          `Accepted ${item.title} / ${layerMetadata.name}: ${parseResult.summary.included_records} restroom records from ${rawGeoJson.features.length} raw features`
        );
      } catch (error) {
        rejectedRecords.push({
          item_id: item.id,
          title: item.title,
          reason: `layer_processing_failed:${error instanceof Error ? error.message : String(error)}`,
          score: null,
          url: layerUrl,
        });
      }
    }
  }

  const mergedResult = mergeParseResults(normalizedResults);
  await writeFile(outputPath, JSON.stringify(mergedResult, null, 2));

  const manifest: ArcGisDiscoveryManifest = {
    run_label: options.runLabel,
    generated_at: new Date().toISOString(),
    search_endpoint: options.searchEndpoint,
    search_terms: options.searchTerms,
    summary: {
      discovered_items: searchResults.length,
      candidate_items: candidateItems.length,
      accepted_layers: downloadedLayers.length,
      downloaded_layers: downloadedLayers.length,
      normalized_records: mergedResult.summary.included_records,
      skipped_records: mergedResult.summary.skipped_records,
    },
    discovered_items: discoveredItems,
    downloaded_layers: downloadedLayers,
    rejected_records: rejectedRecords,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Accepted layers: ${downloadedLayers.length}`);
  console.log(`Normalized records: ${mergedResult.summary.included_records}`);
  console.log(`Skipped records: ${mergedResult.summary.skipped_records}`);
  console.log(`Normalized output written to ${outputPath}`);
  console.log(`Manifest written to ${manifestPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
