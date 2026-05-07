import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImportedPublicBathroomParseResult } from '../src/lib/import/public-restroom-import';

const {
  buildDefaultRunLabel,
  fetchJsonWithRetry,
  mergeImportedPublicBathroomParseResults,
  sanitizeFileName,
  sleep,
} = (await import(
  new URL('../src/lib/import/government-open-data.ts', import.meta.url).href
)) as typeof import('../src/lib/import/government-open-data');
const {
  buildSocrataDatasetPageUrl,
  buildSocrataGeoJsonUrl,
  parseSocrataRestroomGeoJson,
  scoreSocrataDatasetRelevance,
} = (await import(
  new URL('../src/lib/import/socrata-public-restrooms.ts', import.meta.url).href
)) as typeof import('../src/lib/import/socrata-public-restrooms');

type SocrataCatalogResult = import('../src/lib/import/socrata-public-restrooms').SocrataCatalogResult;

interface CliOptions {
  outputPath: string | null;
  runLabel: string;
  rawDirectory: string | null;
  manifestPath: string | null;
  maxSearchResultsPerQuery: number;
  maxCandidateDatasets: number;
  maxAcceptedDatasets: number;
  pageSize: number;
  searchTerms: string[];
  searchEndpoint: string;
}

interface SocrataCatalogResponse {
  results?: SocrataCatalogResult[];
  resultSetSize?: number;
}

interface GenericGeoJsonFeature {
  type: 'Feature';
  geometry?: unknown;
  properties?: Record<string, unknown> | null;
}

interface GenericGeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GenericGeoJsonFeature[];
}

interface DiscoveredDatasetRecord {
  dataset_id: string;
  title: string;
  domain: string | null;
  score: number;
  url: string | null;
}

interface DownloadedDatasetRecord {
  dataset_id: string;
  title: string;
  domain: string | null;
  raw_geojson_path: string;
  raw_feature_count: number;
  normalized_included_records: number;
  normalized_skipped_records: number;
}

interface RejectedDatasetRecord {
  dataset_id: string;
  title: string;
  domain: string | null;
  reason: string;
  score: number | null;
  url: string | null;
}

interface SocrataDiscoveryManifest {
  run_label: string;
  generated_at: string;
  search_endpoint: string;
  search_terms: string[];
  summary: {
    discovered_datasets: number;
    candidate_datasets: number;
    accepted_datasets: number;
    normalized_records: number;
    skipped_records: number;
  };
  discovered_datasets: DiscoveredDatasetRecord[];
  downloaded_datasets: DownloadedDatasetRecord[];
  rejected_datasets: RejectedDatasetRecord[];
}

const DEFAULT_SEARCH_TERMS = [
  'public restroom',
  'restroom',
  'bathroom',
  'toilet',
  'comfort station',
];
const DEFAULT_SEARCH_ENDPOINT = 'https://api.us.socrata.com/api/catalog/v1';
const FETCH_DELAY_MS = 250;
const DATASET_SCORE_THRESHOLD = 8;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputPath: null,
    runLabel: buildDefaultRunLabel(),
    rawDirectory: null,
    manifestPath: null,
    maxSearchResultsPerQuery: 100,
    maxCandidateDatasets: 120,
    maxAcceptedDatasets: 30,
    pageSize: 1000,
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

    if (argument.startsWith('--max-candidate-datasets=')) {
      options.maxCandidateDatasets = Number.parseInt(
        argument.slice('--max-candidate-datasets='.length).trim(),
        10
      );
      continue;
    }

    if (argument.startsWith('--max-accepted-datasets=')) {
      options.maxAcceptedDatasets = Number.parseInt(
        argument.slice('--max-accepted-datasets='.length).trim(),
        10
      );
      continue;
    }

    if (argument.startsWith('--page-size=')) {
      options.pageSize = Number.parseInt(argument.slice('--page-size='.length).trim(), 10);
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

function buildDefaultRawDirectory(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'socrata-open-data', 'runs', runLabel, 'raw');
}

function buildDefaultOutputPath(workspaceRoot: string, runLabel: string): string {
  return path.join(
    workspaceRoot,
    'PublicRestroomData',
    'socrata-open-data',
    'runs',
    runLabel,
    'normalized',
    'socrata-open-data.stallpass-import.json'
  );
}

function buildDefaultManifestPath(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'socrata-open-data', 'runs', runLabel, 'socrata-open-data.manifest.json');
}

function getDatasetKey(item: SocrataCatalogResult): string {
  return `${item.metadata?.domain ?? 'unknown'}:${item.resource.id}`;
}

async function searchSocrataDatasets(
  endpoint: string,
  term: string,
  maxResults: number
): Promise<SocrataCatalogResult[]> {
  const collectedItems: SocrataCatalogResult[] = [];
  let offset = 0;

  while (collectedItems.length < maxResults) {
    const pageSize = Math.min(100, maxResults - collectedItems.length);
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.set('q', term);
    requestUrl.searchParams.set('only', 'datasets');
    requestUrl.searchParams.set('limit', String(pageSize));
    requestUrl.searchParams.set('offset', String(offset));
    const response = await fetchJsonWithRetry<SocrataCatalogResponse>(requestUrl.toString());
    const pageItems = response.results ?? [];

    if (pageItems.length === 0) {
      break;
    }

    collectedItems.push(...pageItems);
    offset += pageItems.length;

    if (pageItems.length < pageSize) {
      break;
    }

    await sleep(FETCH_DELAY_MS);
  }

  return collectedItems.slice(0, maxResults);
}

function dedupeAndRankDatasets(
  items: SocrataCatalogResult[],
  maxCandidateDatasets: number
): SocrataCatalogResult[] {
  const itemById = new Map<string, SocrataCatalogResult>();

  for (const item of items) {
    const key = getDatasetKey(item);
    const existingItem = itemById.get(key);

    if (!existingItem) {
      itemById.set(key, item);
      continue;
    }

    const existingUpdatedAt = existingItem.resource.data_updated_at ?? existingItem.resource.updatedAt ?? '';
    const candidateUpdatedAt = item.resource.data_updated_at ?? item.resource.updatedAt ?? '';

    if (candidateUpdatedAt > existingUpdatedAt) {
      itemById.set(key, item);
    }
  }

  return Array.from(itemById.values())
    .map((item) => ({
      item,
      score: scoreSocrataDatasetRelevance(item),
    }))
    .filter((candidate) => candidate.score >= DATASET_SCORE_THRESHOLD)
    .sort(
      (leftItem, rightItem) =>
        rightItem.score - leftItem.score ||
        (rightItem.item.resource.download_count ?? 0) - (leftItem.item.resource.download_count ?? 0)
    )
    .slice(0, maxCandidateDatasets)
    .map((candidate) => candidate.item);
}

async function downloadDatasetGeoJson(
  item: SocrataCatalogResult,
  pageSize: number
): Promise<GenericGeoJsonFeatureCollection> {
  const features: GenericGeoJsonFeature[] = [];
  let offset = 0;
  let hasMorePages = true;

  while (hasMorePages) {
    const requestUrl = buildSocrataGeoJsonUrl(item, pageSize, offset);
    const response = await fetchJsonWithRetry<Partial<GenericGeoJsonFeatureCollection>>(requestUrl);

    if (response.type !== 'FeatureCollection' || !Array.isArray(response.features)) {
      throw new Error(`Dataset ${item.resource.id} returned a non-GeoJSON response.`);
    }

    if (response.features.length === 0) {
      hasMorePages = false;
      continue;
    }

    features.push(...response.features);
    offset += response.features.length;

    if (response.features.length < pageSize) {
      hasMorePages = false;
      continue;
    }

    await sleep(FETCH_DELAY_MS);
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

function mergeParseResults(results: ImportedPublicBathroomParseResult[]): ImportedPublicBathroomParseResult {
  return mergeImportedPublicBathroomParseResults(results);
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const rawDirectory = options.rawDirectory ?? buildDefaultRawDirectory(workspaceRoot, options.runLabel);
  const outputPath = options.outputPath ?? buildDefaultOutputPath(workspaceRoot, options.runLabel);
  const manifestPath = options.manifestPath ?? buildDefaultManifestPath(workspaceRoot, options.runLabel);
  const metadataDirectory = path.join(path.dirname(manifestPath), 'metadata');
  const normalizedResults: ImportedPublicBathroomParseResult[] = [];
  const discoveredDatasets: DiscoveredDatasetRecord[] = [];
  const downloadedDatasets: DownloadedDatasetRecord[] = [];
  const rejectedDatasets: RejectedDatasetRecord[] = [];
  const searchResults: SocrataCatalogResult[] = [];

  await mkdir(rawDirectory, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(metadataDirectory, { recursive: true });

  for (const term of options.searchTerms) {
    console.log(`Searching Socrata for "${term}"`);
    const termResults = await searchSocrataDatasets(
      options.searchEndpoint,
      term,
      options.maxSearchResultsPerQuery
    );
    searchResults.push(...termResults);
    await sleep(FETCH_DELAY_MS);
  }

  const candidateDatasets = dedupeAndRankDatasets(searchResults, options.maxCandidateDatasets);
  console.log(
    `Discovered ${searchResults.length} raw Socrata dataset hits; ${candidateDatasets.length} candidate datasets survived scoring.`
  );

  for (const item of candidateDatasets) {
    discoveredDatasets.push({
      dataset_id: item.resource.id,
      title: item.resource.name,
      domain: item.metadata?.domain ?? null,
      score: scoreSocrataDatasetRelevance(item),
      url: item.link ?? item.permalink ?? null,
    });
  }

  for (const item of candidateDatasets) {
    if (downloadedDatasets.length >= options.maxAcceptedDatasets) {
      break;
    }

    console.log(`Inspecting ${item.resource.name}`);

    try {
      const rawGeoJson = await downloadDatasetGeoJson(item, options.pageSize);

      if (rawGeoJson.features.length === 0) {
        rejectedDatasets.push({
          dataset_id: item.resource.id,
          title: item.resource.name,
          domain: item.metadata?.domain ?? null,
          reason: 'empty_dataset',
          score: scoreSocrataDatasetRelevance(item),
          url: item.link ?? item.permalink ?? null,
        });
        continue;
      }

      const rawFileName = `${sanitizeFileName(item.resource.name)}-${sanitizeFileName(item.metadata?.domain ?? 'unknown')}-${item.resource.id}.geojson`;
      const rawGeoJsonPath = path.join(rawDirectory, rawFileName);
      await writeFile(rawGeoJsonPath, JSON.stringify(rawGeoJson, null, 2));
      await writeFile(
        path.join(metadataDirectory, `${sanitizeFileName(item.resource.name)}-${item.resource.id}.json`),
        JSON.stringify(item, null, 2)
      );

      const parseResult = parseSocrataRestroomGeoJson(JSON.stringify(rawGeoJson), item);
      normalizedResults.push(parseResult);
      downloadedDatasets.push({
        dataset_id: item.resource.id,
        title: item.resource.name,
        domain: item.metadata?.domain ?? null,
        raw_geojson_path: rawGeoJsonPath,
        raw_feature_count: rawGeoJson.features.length,
        normalized_included_records: parseResult.summary.included_records,
        normalized_skipped_records: parseResult.summary.skipped_records,
      });

      console.log(
        `Accepted ${item.resource.name}: ${parseResult.summary.included_records} restroom records from ${rawGeoJson.features.length} raw features`
      );
    } catch (error) {
      rejectedDatasets.push({
        dataset_id: item.resource.id,
        title: item.resource.name,
        domain: item.metadata?.domain ?? null,
        reason: `dataset_processing_failed:${error instanceof Error ? error.message : String(error)}`,
        score: null,
        url: (() => {
          try {
            return buildSocrataDatasetPageUrl(item);
          } catch {
            return item.link ?? item.permalink ?? null;
          }
        })(),
      });
    }
  }

  const mergedResult = mergeParseResults(normalizedResults);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(mergedResult, null, 2));

  const manifest: SocrataDiscoveryManifest = {
    run_label: options.runLabel,
    generated_at: new Date().toISOString(),
    search_endpoint: options.searchEndpoint,
    search_terms: options.searchTerms,
    summary: {
      discovered_datasets: searchResults.length,
      candidate_datasets: candidateDatasets.length,
      accepted_datasets: downloadedDatasets.length,
      normalized_records: mergedResult.summary.included_records,
      skipped_records: mergedResult.summary.skipped_records,
    },
    discovered_datasets: discoveredDatasets,
    downloaded_datasets: downloadedDatasets,
    rejected_datasets: rejectedDatasets,
  };
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Accepted datasets: ${downloadedDatasets.length}`);
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
