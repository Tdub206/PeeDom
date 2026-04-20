import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ImportedPublicBathroomParseResult,
  ImportedPublicBathroomRecord,
  JsonObject,
} from '../src/lib/import/public-restroom-import';

const { parseNormalizedPublicBathroomImport, parseSeattleParksGeoJson } = (await import(
  new URL('../src/lib/import/public-restroom-import.ts', import.meta.url).href
)) as typeof import('../src/lib/import/public-restroom-import');

interface CliOptions {
  source: 'seattle-parks' | 'normalized-json';
  inputPath: string | null;
  outputPath: string | null;
  apply: boolean;
  includeLimitedUse: boolean;
}

interface ExistingBathroomRow {
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
  accessibility_features: unknown;
  hours_json: unknown;
  source_type: string | null;
  moderation_status: string | null;
  show_on_free_map: boolean | null;
  hours_source: string | null;
  google_place_id: string | null;
  access_type: string | null;
  location_archetype: string | null;
  archetype_metadata: unknown;
}

interface BathroomMutationRow {
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
  accessibility_features: unknown;
  hours_json: unknown;
  source_type: string;
  moderation_status: string;
  show_on_free_map: boolean;
  hours_source: string;
  google_place_id: string | null;
  access_type: string;
  location_archetype: string;
  archetype_metadata: JsonObject;
}

interface SupabaseRestContext {
  restUrl: string;
  headers: Record<string, string>;
}

interface ApplySummary {
  inserted: number;
  updated: number;
}

const DEFAULT_SOURCE: CliOptions['source'] = 'seattle-parks';

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    source: DEFAULT_SOURCE,
    inputPath: null,
    outputPath: null,
    apply: false,
    includeLimitedUse: false,
  };

  for (const argument of argv.slice(2)) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }

    if (argument === '--include-limited-use') {
      options.includeLimitedUse = true;
      continue;
    }

    if (argument.startsWith('--source=')) {
      const sourceValue = argument.slice('--source='.length).trim();

      if (sourceValue === 'seattle-parks' || sourceValue === 'normalized-json') {
        options.source = sourceValue;
        continue;
      }

      throw new Error(`Unsupported source "${sourceValue}".`);
    }

    if (argument.startsWith('--input=')) {
      options.inputPath = argument.slice('--input='.length).trim();
      continue;
    }

    if (argument.startsWith('--output=')) {
      options.outputPath = argument.slice('--output='.length).trim();
      continue;
    }
  }

  return options;
}

async function findNewestInputFileInWorkspace(
  workspaceRoot: string,
  source: CliOptions['source']
): Promise<string> {
  const importDirectory =
    source === 'normalized-json'
      ? path.join(workspaceRoot, 'PublicRestroomData', 'normalized')
      : path.join(workspaceRoot, 'PublicRestroomData');
  const entries = await readdir(importDirectory, { withFileTypes: true });
  const candidateEntries = entries
    .filter((entry) =>
      entry.isFile() &&
      (source === 'normalized-json'
        ? entry.name.toLowerCase().endsWith('.stallpass-import.json')
        : entry.name.toLowerCase().endsWith('.geojson'))
    )
    .map((entry) => path.join(importDirectory, entry.name));

  if (candidateEntries.length === 0) {
    throw new Error(`No ${source} input file found in ${importDirectory}.`);
  }

  const stats = await Promise.all(
    candidateEntries.map(async (filePath) => ({
      filePath,
      stats: await stat(filePath),
    }))
  );

  stats.sort((leftItem, rightItem) => rightItem.stats.mtimeMs - leftItem.stats.mtimeMs);

  return stats[0]?.filePath ?? candidateEntries[0];
}

function buildDefaultOutputPath(inputPath: string, source: CliOptions['source']): string {
  if (source === 'normalized-json') {
    return inputPath;
  }

  const normalizedDirectory = path.join(path.dirname(inputPath), 'normalized');
  const fileName = `${path.basename(inputPath, path.extname(inputPath))}.stallpass-import.json`;
  return path.join(normalizedDirectory, fileName);
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function roundCoordinate(value: number): string {
  return value.toFixed(5);
}

function buildGeoNameKey(placeName: string, latitude: number, longitude: number): string {
  return `${roundCoordinate(latitude)}:${roundCoordinate(longitude)}:${normalizeName(placeName)}`;
}

function asJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function buildExternalSourceKey(metadata: unknown): string | null {
  const metadataObject = asJsonObject(metadata);
  const importSource = typeof metadataObject.import_source === 'string' ? metadataObject.import_source : null;
  const externalSourceId =
    typeof metadataObject.external_source_id === 'string' ? metadataObject.external_source_id : null;

  if (!importSource || !externalSourceId) {
    return null;
  }

  return `${importSource}:${externalSourceId}`;
}

function buildImportedSourceKey(importedRecord: ImportedPublicBathroomRecord): string {
  const metadataObject = asJsonObject(importedRecord.archetype_metadata);
  const importSource =
    typeof metadataObject.import_source === 'string' ? metadataObject.import_source : 'imported-source';

  return `${importSource}:${importedRecord.external_source_id}`;
}

function mergeArchetypeMetadata(existingValue: unknown, importedValue: JsonObject): JsonObject {
  return {
    ...asJsonObject(existingValue),
    ...importedValue,
  };
}

function mergeBathroomUpdate(
  existingRow: ExistingBathroomRow,
  importedRecord: ImportedPublicBathroomRecord
): Partial<BathroomMutationRow> {
  const existingMetadata = asJsonObject(existingRow.archetype_metadata);
  const existingShowOnFreeMap = existingRow.show_on_free_map ?? true;

  return {
    place_name: existingRow.place_name || importedRecord.place_name,
    address_line1: existingRow.address_line1 ?? importedRecord.address_line1,
    city: existingRow.city ?? importedRecord.city,
    state: existingRow.state ?? importedRecord.state,
    postal_code: existingRow.postal_code ?? importedRecord.postal_code,
    country_code: existingRow.country_code || importedRecord.country_code,
    latitude: importedRecord.latitude,
    longitude: importedRecord.longitude,
    is_locked: existingRow.is_locked ?? importedRecord.is_locked,
    is_accessible: existingRow.is_accessible ?? importedRecord.is_accessible,
    is_customer_only: existingRow.is_customer_only || importedRecord.is_customer_only,
    accessibility_features:
      existingRow.accessibility_features ?? importedRecord.accessibility_features,
    hours_json: existingRow.hours_json ?? importedRecord.hours_json,
    source_type: existingRow.source_type ?? importedRecord.source_type,
    moderation_status:
      existingRow.moderation_status && existingRow.moderation_status !== 'deleted'
        ? existingRow.moderation_status
        : importedRecord.moderation_status,
    show_on_free_map: existingShowOnFreeMap || importedRecord.show_on_free_map,
    hours_source: existingRow.hours_source ?? importedRecord.hours_source,
    google_place_id: existingRow.google_place_id ?? importedRecord.google_place_id,
    access_type: existingRow.access_type ?? importedRecord.access_type,
    location_archetype:
      existingRow.location_archetype && existingRow.location_archetype !== 'general'
        ? existingRow.location_archetype
        : importedRecord.location_archetype,
    archetype_metadata: mergeArchetypeMetadata(existingMetadata, importedRecord.archetype_metadata),
  };
}

function buildInsertPayload(importedRecord: ImportedPublicBathroomRecord): BathroomMutationRow {
  const { dedupe_key, external_source_id, ...databaseRecord } = importedRecord;

  return {
    ...databaseRecord,
    archetype_metadata: {
      ...databaseRecord.archetype_metadata,
      import_dedupe_key: dedupe_key,
      external_source_id,
    },
  } satisfies BathroomMutationRow;
}

async function fetchExistingBathrooms(
  restContext: SupabaseRestContext,
  importedRecords: ImportedPublicBathroomRecord[]
): Promise<ExistingBathroomRow[]> {
  if (importedRecords.length === 0) {
    return [];
  }

  const scopes = new Map<string, { state: string | null; city: string | null; countryCode: string }>();

  for (const importedRecord of importedRecords) {
    const scopeKey = `${importedRecord.country_code}:${importedRecord.state ?? '__null__'}:${
      importedRecord.city ?? '__null__'
    }`;

    if (!scopes.has(scopeKey)) {
      scopes.set(scopeKey, {
        state: importedRecord.state,
        city: importedRecord.city,
        countryCode: importedRecord.country_code,
      });
    }
  }

  const rowsById = new Map<string, ExistingBathroomRow>();

  for (const scope of scopes.values()) {
    const requestUrl = new URL(`${restContext.restUrl}/bathrooms`);
    requestUrl.searchParams.set('select', '*');
    requestUrl.searchParams.set('country_code', `eq.${scope.countryCode}`);

    if (scope.state) {
      requestUrl.searchParams.set('state', `eq.${scope.state}`);
    } else if (scope.city) {
      requestUrl.searchParams.set('city', `eq.${scope.city}`);
    }

    const scopeRows = await requestJson<ExistingBathroomRow[]>(requestUrl, {
      method: 'GET',
      headers: restContext.headers,
    });

    for (const row of scopeRows) {
      rowsById.set(row.id, row);
    }
  }

  return Array.from(rowsById.values());
}

async function applyRecords(
  restContext: SupabaseRestContext,
  importedRecords: ImportedPublicBathroomRecord[]
): Promise<ApplySummary> {
  const existingRows = await fetchExistingBathrooms(restContext, importedRecords);
  const sourceIdMap = new Map<string, ExistingBathroomRow>();
  const geoNameMap = new Map<string, ExistingBathroomRow>();

  for (const existingRow of existingRows) {
    const externalSourceKey = buildExternalSourceKey(existingRow.archetype_metadata);

    if (externalSourceKey) {
      sourceIdMap.set(externalSourceKey, existingRow);
    }

    if (existingRow.moderation_status !== 'deleted') {
      geoNameMap.set(
        buildGeoNameKey(existingRow.place_name, existingRow.latitude, existingRow.longitude),
        existingRow
      );
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const importedRecord of importedRecords) {
    const sourceKey = buildImportedSourceKey(importedRecord);
    const bySourceId = sourceIdMap.get(sourceKey);
    const byGeoName = geoNameMap.get(importedRecord.dedupe_key);
    const existingRow = bySourceId ?? byGeoName ?? null;

    if (existingRow) {
      const updatePayload = mergeBathroomUpdate(existingRow, importedRecord);
      await updateBathroom(restContext, existingRow.id, updatePayload);

      const refreshedRow: ExistingBathroomRow = {
        ...existingRow,
        ...updatePayload,
        id: existingRow.id,
      } as ExistingBathroomRow;
      sourceIdMap.set(sourceKey, refreshedRow);
      geoNameMap.set(importedRecord.dedupe_key, refreshedRow);
      updated += 1;
      continue;
    }

    const insertPayload = buildInsertPayload(importedRecord);
    const insertedRow = await insertBathroom(restContext, insertPayload);
    sourceIdMap.set(sourceKey, insertedRow);
    geoNameMap.set(importedRecord.dedupe_key, insertedRow);
    inserted += 1;
  }

  return { inserted, updated };
}

function formatSummary(parseResult: ImportedPublicBathroomParseResult): string {
  const { summary } = parseResult;

  return [
    `Total features: ${summary.total_features}`,
    `Included records: ${summary.included_records}`,
    `Skipped records: ${summary.skipped_records}`,
    `Parsed hours: ${summary.parsed_hours_records}`,
    `Ambiguous hours: ${summary.ambiguous_hours_records}`,
    `Skip counts: ${JSON.stringify(summary.skip_counts)}`,
  ].join('\n');
}

async function requestJson<T>(requestUrl: URL, init: RequestInit): Promise<T> {
  const response = await fetch(requestUrl, init);

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Supabase REST request failed (${response.status}): ${responseBody}`);
  }

  return (await response.json()) as T;
}

function createRestContext(supabaseUrl: string, serviceRoleKey: string): SupabaseRestContext {
  return {
    restUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  };
}

async function updateBathroom(
  restContext: SupabaseRestContext,
  bathroomId: string,
  updatePayload: Partial<BathroomMutationRow>
): Promise<void> {
  const requestUrl = new URL(`${restContext.restUrl}/bathrooms`);
  requestUrl.searchParams.set('id', `eq.${bathroomId}`);

  const response = await fetch(requestUrl, {
    method: 'PATCH',
    headers: {
      ...restContext.headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Unable to update bathroom ${bathroomId}: ${responseBody}`);
  }
}

async function insertBathroom(
  restContext: SupabaseRestContext,
  insertPayload: BathroomMutationRow
): Promise<ExistingBathroomRow> {
  const requestUrl = new URL(`${restContext.restUrl}/bathrooms`);
  requestUrl.searchParams.set('select', '*');

  const insertedRows = await requestJson<ExistingBathroomRow[]>(requestUrl, {
    method: 'POST',
    headers: {
      ...restContext.headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(insertPayload),
  });

  const insertedRow = insertedRows[0];

  if (!insertedRow) {
    throw new Error('Supabase insert succeeded but returned no bathroom row.');
  }

  return insertedRow;
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const inputPath = options.inputPath ?? (await findNewestInputFileInWorkspace(workspaceRoot, options.source));
  const outputPath = options.outputPath ?? buildDefaultOutputPath(inputPath, options.source);
  const raw = await readFile(inputPath, 'utf8');
  const parseResult =
    options.source === 'normalized-json'
      ? parseNormalizedPublicBathroomImport(raw)
      : parseSeattleParksGeoJson(raw, {
          includeLimitedUse: options.includeLimitedUse,
        });

  if (options.source !== 'normalized-json' || options.outputPath !== null) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(parseResult, null, 2));
  }

  console.log(formatSummary(parseResult));
  console.log(
    options.source === 'normalized-json' && options.outputPath === null
      ? `Normalized import loaded from ${inputPath}`
      : `Normalized output written to ${outputPath}`
  );

  if (!options.apply) {
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when using --apply.');
  }

  const restContext = createRestContext(supabaseUrl, serviceRoleKey);
  const applySummary = await applyRecords(restContext, parseResult.records);
  console.log(
    `Applied to Supabase. Inserted ${applySummary.inserted} and updated ${applySummary.updated} bathrooms.`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
