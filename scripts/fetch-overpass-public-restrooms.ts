import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImportedPublicBathroomParseResult, PublicImportSkipReason } from '../src/lib/import/public-restroom-import';

const { parseOsmOverpassPublicRestrooms } = (await import(
  new URL('../src/lib/import/osm-overpass-public-restrooms.ts', import.meta.url).href
)) as typeof import('../src/lib/import/osm-overpass-public-restrooms');

interface CliOptions {
  endpoint: string;
  outputPath: string | null;
  rawDirectory: string | null;
  stateCodes: string[] | null;
  delayMs: number;
  timeoutSeconds: number;
  includeExpandedTextMatches: boolean;
  refresh: boolean;
}

interface UsState {
  code: string;
  name: string;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const DEFAULT_DELAY_MS = 1_500;
const DEFAULT_TIMEOUT_SECONDS = 180;
const REQUEST_RETRIES = 2;
const USER_AGENT = 'StallPass public-restroom importer';

const US_STATES: UsState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const SKIP_REASONS: PublicImportSkipReason[] = [
  'missing_point_geometry',
  'missing_name',
  'not_restroom',
  'not_active_lifecycle',
  'not_public',
  'not_open',
];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    endpoint: OVERPASS_ENDPOINT,
    outputPath: null,
    rawDirectory: null,
    stateCodes: null,
    delayMs: DEFAULT_DELAY_MS,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    includeExpandedTextMatches: true,
    refresh: false,
  };

  for (const argument of argv.slice(2)) {
    if (argument === '--canonical-only') {
      options.includeExpandedTextMatches = false;
      continue;
    }

    if (argument === '--refresh') {
      options.refresh = true;
      continue;
    }

    if (argument.startsWith('--endpoint=')) {
      options.endpoint = argument.slice('--endpoint='.length).trim();
      continue;
    }

    if (argument.startsWith('--output=')) {
      options.outputPath = argument.slice('--output='.length).trim();
      continue;
    }

    if (argument.startsWith('--raw-dir=')) {
      options.rawDirectory = argument.slice('--raw-dir='.length).trim();
      continue;
    }

    if (argument.startsWith('--states=')) {
      options.stateCodes = argument
        .slice('--states='.length)
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0);
      continue;
    }

    if (argument.startsWith('--delay-ms=')) {
      options.delayMs = Number.parseInt(argument.slice('--delay-ms='.length).trim(), 10);
      continue;
    }

    if (argument.startsWith('--timeout-seconds=')) {
      options.timeoutSeconds = Number.parseInt(argument.slice('--timeout-seconds='.length).trim(), 10);
    }
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDefaultOutputPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'normalized', 'osm-overpass-us.stallpass-import.json');
}

function buildDefaultRawDirectory(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'PublicRestroomData', 'overpass-us', 'raw');
}

function getTargetStates(options: CliOptions): UsState[] {
  if (!options.stateCodes || options.stateCodes.length === 0) {
    return US_STATES;
  }

  const stateMap = new Map(US_STATES.map((state) => [state.code, state]));
  const selectedStates: UsState[] = [];

  for (const stateCode of options.stateCodes) {
    const state = stateMap.get(stateCode);

    if (!state) {
      throw new Error(`Unsupported US state code "${stateCode}".`);
    }

    selectedStates.push(state);
  }

  return selectedStates;
}

function buildOverpassQuery(state: UsState, options: CliOptions): string {
  const clauses = [
    'nwr(area.searchArea)["amenity"="toilets"];',
    'nwr(area.searchArea)["building"="toilets"];',
  ];

  if (options.includeExpandedTextMatches) {
    clauses.push('nwr(area.searchArea)["name"~"(restroom|bathroom|washroom|lavatory|comfort station)",i];');
    clauses.push('nwr(area.searchArea)["alt_name"~"(restroom|bathroom|washroom|lavatory|comfort station)",i];');
    clauses.push(
      'nwr(area.searchArea)["official_name"~"(restroom|bathroom|washroom|lavatory|comfort station)",i];'
    );
  }

  return `
    [out:json][timeout:${options.timeoutSeconds}];
    area["ISO3166-2"="US-${state.code}"][admin_level=4]->.searchArea;
    (
      ${clauses.join('\n      ')}
    );
    out center tags meta;
  `.trim();
}

function buildRawStatePath(rawDirectory: string, state: UsState): string {
  return path.join(rawDirectory, `US-${state.code}.overpass.json`);
}

async function readCachedStatePayload(rawDirectory: string, state: UsState): Promise<string | null> {
  const rawStatePath = buildRawStatePath(rawDirectory, state);

  try {
    await access(rawStatePath);
  } catch (_error) {
    return null;
  }

  return readFile(rawStatePath, 'utf8');
}

async function fetchStatePayload(
  state: UsState,
  options: CliOptions,
  rawDirectory: string
): Promise<string> {
  if (!options.refresh) {
    const cachedPayload = await readCachedStatePayload(rawDirectory, state);

    if (cachedPayload) {
      return cachedPayload;
    }
  }

  const query = buildOverpassQuery(state, options);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Overpass returned ${response.status}: ${responseText.slice(0, 500)}`);
      }

      JSON.parse(responseText);
      await mkdir(rawDirectory, { recursive: true });
      await writeFile(buildRawStatePath(rawDirectory, state), responseText);
      return responseText;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === REQUEST_RETRIES) {
        break;
      }

      await sleep(options.delayMs * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch Overpass data for ${state.code}.`);
}

function mergeResults(results: ImportedPublicBathroomParseResult[]): ImportedPublicBathroomParseResult {
  const dedupeKeys = new Set<string>();
  const sourceKeys = new Set<string>();
  const records: ImportedPublicBathroomParseResult['records'] = [];
  const skipped: ImportedPublicBathroomParseResult['skipped'] = [];
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
      const sourceKey = `${record.external_source_id}:${record.dedupe_key}`;

      if (dedupeKeys.has(record.dedupe_key) || sourceKeys.has(sourceKey)) {
        continue;
      }

      dedupeKeys.add(record.dedupe_key);
      sourceKeys.add(sourceKey);
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

function formatSummary(result: ImportedPublicBathroomParseResult, states: UsState[]): string {
  return [
    `States queried: ${states.length}`,
    `Total features: ${result.summary.total_features}`,
    `Included records: ${result.summary.included_records}`,
    `Skipped records: ${result.summary.skipped_records}`,
    `Parsed hours: ${result.summary.parsed_hours_records}`,
    `Ambiguous hours: ${result.summary.ambiguous_hours_records}`,
    `Skip counts: ${JSON.stringify(result.summary.skip_counts)}`,
  ].join('\n');
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const targetStates = getTargetStates(options);
  const outputPath = options.outputPath ?? buildDefaultOutputPath(workspaceRoot);
  const rawDirectory = options.rawDirectory ?? buildDefaultRawDirectory(workspaceRoot);
  const stateResults: ImportedPublicBathroomParseResult[] = [];

  for (const [index, state] of targetStates.entries()) {
    console.log(`[${state.code}] ${state.name} (${index + 1}/${targetStates.length})`);
    const rawPayload = await fetchStatePayload(state, options, rawDirectory);
    const parsedResult = parseOsmOverpassPublicRestrooms(rawPayload, {
      stateCode: state.code,
      stateName: state.name,
      includeExpandedTextMatches: options.includeExpandedTextMatches,
    });

    stateResults.push(parsedResult);
    console.log(
      `[${state.code}] ${parsedResult.summary.included_records} records, ${parsedResult.summary.skipped_records} skipped`
    );

    if (index < targetStates.length - 1) {
      await sleep(options.delayMs);
    }
  }

  const mergedResult = mergeResults(stateResults);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(mergedResult, null, 2));
  console.log(formatSummary(mergedResult, targetStates));
  console.log(`Normalized output written to ${outputPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
