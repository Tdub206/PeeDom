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
  buildCkanDatasetPageUrl,
  parseCkanRestroomGeoJson,
  scoreCkanDatasetRelevance,
  selectBestCkanGeoJsonResource,
} = (await import(
  new URL('../src/lib/import/ckan-public-restrooms.ts', import.meta.url).href
)) as typeof import('../src/lib/import/ckan-public-restrooms');

type CkanPortalConfig = import('../src/lib/import/ckan-public-restrooms').CkanPortalConfig;
type CkanPackage = import('../src/lib/import/ckan-public-restrooms').CkanPackage;
type CkanResource = import('../src/lib/import/ckan-public-restrooms').CkanResource;

interface CliOptions {
  outputPath: string | null;
  runLabel: string;
  rawDirectory: string | null;
  manifestPath: string | null;
  maxSearchResultsPerPortal: number;
  maxCandidateDatasets: number;
  maxAcceptedDatasets: number;
  searchTerms: string[];
  portalKeys: string[] | null;
}

interface CkanPackageSearchResponse {
  success?: boolean;
  result?: {
    results?: CkanPackage[];
  };
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
  portal_key: string;
  dataset_id: string;
  title: string;
  score: number;
  url: string | null;
}

interface DownloadedDatasetRecord {
  portal_key: string;
  dataset_id: string;
  title: string;
  resource_id: string;
  resource_name: string | null;
  raw_geojson_path: string;
  raw_feature_count: number;
  normalized_included_records: number;
  normalized_skipped_records: number;
}

interface RejectedDatasetRecord {
  portal_key: string;
  dataset_id: string;
  title: string;
  reason: string;
  score: number | null;
  url: string | null;
}

interface CkanDiscoveryManifest {
  run_label: string;
  generated_at: string;
  search_terms: string[];
  portals: string[];
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
  'public toilet',
  'restroom',
  'bathroom',
  'toilet',
  'comfort station',
];
const FETCH_DELAY_MS = 250;
const DATASET_SCORE_THRESHOLD = 8;
const DEFAULT_PORTALS: CkanPortalConfig[] = [
  {
    key: 'smartdublin',
    name: 'Smart Dublin',
    apiBaseUrl: 'https://data.smartdublin.ie',
    portalUrl: 'https://data.smartdublin.ie',
    countryCode: 'IE',
  },
  {
    key: 'data-gov-ie',
    name: 'data.gov.ie',
    apiBaseUrl: 'https://data.gov.ie',
    portalUrl: 'https://data.gov.ie',
    countryCode: 'IE',
  },
  {
    key: 'data-gov-uk',
    name: 'data.gov.uk',
    apiBaseUrl: 'https://data.gov.uk',
    portalUrl: 'https://data.gov.uk',
    countryCode: 'GB',
  },
];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputPath: null,
    runLabel: buildDefaultRunLabel(),
    rawDirectory: null,
    manifestPath: null,
    maxSearchResultsPerPortal: 60,
    maxCandidateDatasets: 120,
    maxAcceptedDatasets: 30,
    searchTerms: DEFAULT_SEARCH_TERMS,
    portalKeys: null,
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

    if (argument.startsWith('--max-search-results-per-portal=')) {
      options.maxSearchResultsPerPortal = Number.parseInt(
        argument.slice('--max-search-results-per-portal='.length).trim(),
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

    if (argument.startsWith('--portals=')) {
      const parsedPortals = argument
        .slice('--portals='.length)
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      options.portalKeys = parsedPortals.length > 0 ? parsedPortals : null;
    }
  }

  return options;
}

function buildDefaultRawDirectory(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'ckan-open-data', 'runs', runLabel, 'raw');
}

function buildDefaultOutputPath(workspaceRoot: string, runLabel: string): string {
  return path.join(
    workspaceRoot,
    'PublicRestroomData',
    'ckan-open-data',
    'runs',
    runLabel,
    'normalized',
    'ckan-open-data.stallpass-import.json'
  );
}

function buildDefaultManifestPath(workspaceRoot: string, runLabel: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'ckan-open-data', 'runs', runLabel, 'ckan-open-data.manifest.json');
}

function resolvePortals(portalKeys: string[] | null): CkanPortalConfig[] {
  if (!portalKeys || portalKeys.length === 0) {
    return DEFAULT_PORTALS;
  }

  const portalLookup = new Map(DEFAULT_PORTALS.map((portal) => [portal.key, portal]));
  const portals = portalKeys
    .map((portalKey) => portalLookup.get(portalKey))
    .filter((portal): portal is CkanPortalConfig => Boolean(portal));

  if (portals.length === 0) {
    throw new Error(`None of the requested CKAN portals are configured: ${portalKeys.join(', ')}`);
  }

  return portals;
}

function getDatasetKey(portal: CkanPortalConfig, dataset: CkanPackage): string {
  return `${portal.key}:${dataset.id}`;
}

async function searchCkanPortal(
  portal: CkanPortalConfig,
  term: string,
  maxResults: number
): Promise<CkanPackage[]> {
  const requestUrl = new URL('/api/3/action/package_search', portal.apiBaseUrl);
  requestUrl.searchParams.set('q', term);
  requestUrl.searchParams.set('rows', String(Math.min(maxResults, 100)));
  const response = await fetchJsonWithRetry<CkanPackageSearchResponse>(requestUrl.toString());
  return response.result?.results?.slice(0, maxResults) ?? [];
}

function dedupeAndRankDatasets(
  portalResults: Array<{ portal: CkanPortalConfig; dataset: CkanPackage }>,
  maxCandidateDatasets: number
): Array<{ portal: CkanPortalConfig; dataset: CkanPackage }> {
  const itemById = new Map<string, { portal: CkanPortalConfig; dataset: CkanPackage }>();

  for (const result of portalResults) {
    const key = getDatasetKey(result.portal, result.dataset);
    const existingResult = itemById.get(key);

    if (!existingResult) {
      itemById.set(key, result);
      continue;
    }

    const existingUpdatedAt =
      existingResult.dataset.updated ?? existingResult.dataset.metadata_modified ?? '';
    const candidateUpdatedAt = result.dataset.updated ?? result.dataset.metadata_modified ?? '';

    if (candidateUpdatedAt > existingUpdatedAt) {
      itemById.set(key, result);
    }
  }

  return Array.from(itemById.values())
    .map((result) => ({
      ...result,
      score: scoreCkanDatasetRelevance(result.dataset),
    }))
    .filter((candidate) => candidate.score >= DATASET_SCORE_THRESHOLD)
    .sort((leftItem, rightItem) => rightItem.score - leftItem.score)
    .slice(0, maxCandidateDatasets)
    .map(({ portal, dataset }) => ({ portal, dataset }));
}

async function downloadResourceGeoJson(resource: CkanResource): Promise<GenericGeoJsonFeatureCollection> {
  const downloadUrl =
    resource.download_url?.trim() || resource.access_url?.trim() || resource.url?.trim() || null;

  if (!downloadUrl) {
    throw new Error(`CKAN resource ${resource.id} does not expose a downloadable URL.`);
  }

  const response = await fetchJsonWithRetry<Partial<GenericGeoJsonFeatureCollection>>(downloadUrl);

  if (response.type !== 'FeatureCollection' || !Array.isArray(response.features)) {
    throw new Error(`CKAN resource ${resource.id} returned a non-GeoJSON response.`);
  }

  return {
    type: 'FeatureCollection',
    features: response.features,
  };
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const portals = resolvePortals(options.portalKeys);
  const rawDirectory = options.rawDirectory ?? buildDefaultRawDirectory(workspaceRoot, options.runLabel);
  const outputPath = options.outputPath ?? buildDefaultOutputPath(workspaceRoot, options.runLabel);
  const manifestPath = options.manifestPath ?? buildDefaultManifestPath(workspaceRoot, options.runLabel);
  const metadataDirectory = path.join(path.dirname(manifestPath), 'metadata');
  const normalizedResults: ImportedPublicBathroomParseResult[] = [];
  const discoveredDatasets: DiscoveredDatasetRecord[] = [];
  const downloadedDatasets: DownloadedDatasetRecord[] = [];
  const rejectedDatasets: RejectedDatasetRecord[] = [];
  const searchResults: Array<{ portal: CkanPortalConfig; dataset: CkanPackage }> = [];

  await mkdir(rawDirectory, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(metadataDirectory, { recursive: true });

  for (const portal of portals) {
    for (const term of options.searchTerms) {
      console.log(`Searching CKAN portal ${portal.key} for "${term}"`);
      const termResults = await searchCkanPortal(
        portal,
        term,
        options.maxSearchResultsPerPortal
      );
      searchResults.push(...termResults.map((dataset) => ({ portal, dataset })));
      await sleep(FETCH_DELAY_MS);
    }
  }

  const candidateDatasets = dedupeAndRankDatasets(searchResults, options.maxCandidateDatasets);
  console.log(
    `Discovered ${searchResults.length} raw CKAN dataset hits; ${candidateDatasets.length} candidate datasets survived scoring.`
  );

  for (const result of candidateDatasets) {
    const datasetTitle = result.dataset.title?.trim() || result.dataset.name?.trim() || result.dataset.id;
    discoveredDatasets.push({
      portal_key: result.portal.key,
      dataset_id: result.dataset.id,
      title: datasetTitle,
      score: scoreCkanDatasetRelevance(result.dataset),
      url: (() => {
        try {
          return buildCkanDatasetPageUrl(result.portal, result.dataset);
        } catch {
          return result.dataset.url?.trim() || null;
        }
      })(),
    });
  }

  for (const result of candidateDatasets) {
    if (downloadedDatasets.length >= options.maxAcceptedDatasets) {
      break;
    }

    const datasetTitle = result.dataset.title?.trim() || result.dataset.name?.trim() || result.dataset.id;
    console.log(`Inspecting ${result.portal.key} / ${datasetTitle}`);
    const resource = selectBestCkanGeoJsonResource(result.dataset);

    if (!resource) {
      rejectedDatasets.push({
        portal_key: result.portal.key,
        dataset_id: result.dataset.id,
        title: datasetTitle,
        reason: 'missing_geojson_resource',
        score: scoreCkanDatasetRelevance(result.dataset),
        url: result.dataset.url?.trim() || null,
      });
      continue;
    }

    try {
      const rawGeoJson = await downloadResourceGeoJson(resource);

      if (rawGeoJson.features.length === 0) {
        rejectedDatasets.push({
          portal_key: result.portal.key,
          dataset_id: result.dataset.id,
          title: datasetTitle,
          reason: 'empty_dataset',
          score: scoreCkanDatasetRelevance(result.dataset),
          url: result.dataset.url?.trim() || null,
        });
        continue;
      }

      const rawFileName = `${result.portal.key}-${sanitizeFileName(datasetTitle)}-${result.dataset.id}-${resource.id}.geojson`;
      const rawGeoJsonPath = path.join(rawDirectory, rawFileName);
      await writeFile(rawGeoJsonPath, JSON.stringify(rawGeoJson, null, 2));
      await writeFile(
        path.join(
          metadataDirectory,
          `${result.portal.key}-${sanitizeFileName(datasetTitle)}-${result.dataset.id}.json`
        ),
        JSON.stringify({ portal: result.portal, dataset: result.dataset, resource }, null, 2)
      );

      const parseResult = parseCkanRestroomGeoJson(
        JSON.stringify(rawGeoJson),
        result.portal,
        result.dataset,
        resource
      );
      normalizedResults.push(parseResult);
      downloadedDatasets.push({
        portal_key: result.portal.key,
        dataset_id: result.dataset.id,
        title: datasetTitle,
        resource_id: resource.id,
        resource_name: resource.name?.trim() || null,
        raw_geojson_path: rawGeoJsonPath,
        raw_feature_count: rawGeoJson.features.length,
        normalized_included_records: parseResult.summary.included_records,
        normalized_skipped_records: parseResult.summary.skipped_records,
      });

      console.log(
        `Accepted ${result.portal.key} / ${datasetTitle}: ${parseResult.summary.included_records} restroom records from ${rawGeoJson.features.length} raw features`
      );
    } catch (error) {
      rejectedDatasets.push({
        portal_key: result.portal.key,
        dataset_id: result.dataset.id,
        title: datasetTitle,
        reason: `dataset_processing_failed:${error instanceof Error ? error.message : String(error)}`,
        score: null,
        url: result.dataset.url?.trim() || null,
      });
    }
  }

  const mergedResult = mergeImportedPublicBathroomParseResults(normalizedResults);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(mergedResult, null, 2));

  const manifest: CkanDiscoveryManifest = {
    run_label: options.runLabel,
    generated_at: new Date().toISOString(),
    search_terms: options.searchTerms,
    portals: portals.map((portal) => portal.key),
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
