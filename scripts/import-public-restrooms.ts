import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ImportedPublicBathroomParseResult,
  ImportedPublicBathroomRecord,
  JsonObject,
  JsonValue,
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
  artifactRawInputPath: string | null;
  artifactRawPath: string | null;
  artifactNormalizedPath: string | null;
}

interface SupabaseRestContext {
  restUrl: string;
  headers: Record<string, string>;
}

interface SourceRecordLookupRow {
  id: string;
  source_key: string;
  external_source_id: string;
}

interface SourceImportRunRow {
  id: string;
}

interface SourceRecordUpsertPayload {
  source_key: string;
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
  accessibility_features: JsonValue;
  hours_json: JsonValue | null;
  show_on_free_map: boolean;
  hours_source: string;
  google_place_id: string | null;
  access_type: string;
  location_archetype: string;
  archetype_metadata: JsonObject;
  source_dataset: string | null;
  source_url: string | null;
  source_license_key: string | null;
  source_attribution_text: string | null;
  source_updated_at: string | null;
  raw_payload: JsonObject;
  raw_payload_hash: string;
  import_run_id: string;
}

interface ReconcileResultRow {
  source_record_id: string;
  canonical_bathroom_id: string | null;
  action: string;
  status: string;
}

interface ApplySummary {
  importRunId: string;
  inserted: number;
  updated: number;
  linked: number;
  promoted: number;
}

const DEFAULT_SOURCE: CliOptions['source'] = 'seattle-parks';
const UPSERT_BATCH_SIZE = 200;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    source: DEFAULT_SOURCE,
    inputPath: null,
    outputPath: null,
    apply: false,
    includeLimitedUse: false,
    artifactRawInputPath: null,
    artifactRawPath: null,
    artifactNormalizedPath: null,
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

    if (argument.startsWith('--artifact-raw-input=')) {
      options.artifactRawInputPath = argument.slice('--artifact-raw-input='.length).trim();
      continue;
    }

    if (argument.startsWith('--artifact-raw-path=')) {
      options.artifactRawPath = argument.slice('--artifact-raw-path='.length).trim();
      continue;
    }

    if (argument.startsWith('--artifact-normalized-path=')) {
      options.artifactNormalizedPath = argument.slice('--artifact-normalized-path='.length).trim();
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

function asJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function getMetadataText(metadata: JsonObject, key: string): string | null {
  const rawValue = metadata[key];
  return typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : null;
}

function buildSourceKey(importedRecord: ImportedPublicBathroomRecord): string {
  const metadataObject = asJsonObject(importedRecord.archetype_metadata);
  const importSource =
    typeof metadataObject.import_source === 'string' && metadataObject.import_source.trim().length > 0
      ? metadataObject.import_source.trim()
      : 'public-import';

  return importSource;
}

function buildSourceAttribution(importedRecord: ImportedPublicBathroomRecord, metadataObject: JsonObject): string | null {
  const sourceKey = buildSourceKey(importedRecord);
  const explicitAttribution = getMetadataText(metadataObject, 'source_attribution_text');

  if (explicitAttribution) {
    return explicitAttribution;
  }

  if (sourceKey === 'osm-overpass-us') {
    return 'OpenStreetMap contributors';
  }

  return getMetadataText(metadataObject, 'source_dataset');
}

function buildSourceLicenseKey(importedRecord: ImportedPublicBathroomRecord, metadataObject: JsonObject): string | null {
  const explicitLicenseKey = getMetadataText(metadataObject, 'source_license_key');

  if (explicitLicenseKey) {
    return explicitLicenseKey;
  }

  return buildSourceKey(importedRecord) === 'osm-overpass-us' ? 'ODbL-1.0' : null;
}

function buildRawPayload(importedRecord: ImportedPublicBathroomRecord): JsonObject {
  return {
    external_source_id: importedRecord.external_source_id,
    dedupe_key: importedRecord.dedupe_key,
    place_name: importedRecord.place_name,
    address_line1: importedRecord.address_line1,
    city: importedRecord.city,
    state: importedRecord.state,
    postal_code: importedRecord.postal_code,
    country_code: importedRecord.country_code,
    latitude: importedRecord.latitude,
    longitude: importedRecord.longitude,
    is_locked: importedRecord.is_locked,
    is_accessible: importedRecord.is_accessible,
    is_customer_only: importedRecord.is_customer_only,
    accessibility_features: importedRecord.accessibility_features as unknown as JsonValue,
    hours_json: (importedRecord.hours_json ?? null) as unknown as JsonValue,
    show_on_free_map: importedRecord.show_on_free_map,
    hours_source: importedRecord.hours_source,
    google_place_id: importedRecord.google_place_id,
    access_type: importedRecord.access_type,
    location_archetype: importedRecord.location_archetype,
    archetype_metadata: importedRecord.archetype_metadata,
  };
}

function buildSourceRecordPayload(
  importedRecord: ImportedPublicBathroomRecord,
  importRunId: string
): SourceRecordUpsertPayload {
  const metadataObject = asJsonObject(importedRecord.archetype_metadata);
  const rawPayload = buildRawPayload(importedRecord);

  return {
    source_key: buildSourceKey(importedRecord),
    external_source_id: importedRecord.external_source_id,
    place_name: importedRecord.place_name,
    address_line1: importedRecord.address_line1,
    city: importedRecord.city,
    state: importedRecord.state,
    postal_code: importedRecord.postal_code,
    country_code: importedRecord.country_code,
    latitude: importedRecord.latitude,
    longitude: importedRecord.longitude,
    is_locked: importedRecord.is_locked,
    is_accessible: importedRecord.is_accessible,
    is_customer_only: importedRecord.is_customer_only,
    accessibility_features: importedRecord.accessibility_features as unknown as JsonValue,
    hours_json: (importedRecord.hours_json ?? null) as unknown as JsonValue,
    show_on_free_map: importedRecord.show_on_free_map,
    hours_source: importedRecord.hours_source,
    google_place_id: importedRecord.google_place_id,
    access_type: importedRecord.access_type,
    location_archetype: importedRecord.location_archetype,
    archetype_metadata: importedRecord.archetype_metadata,
    source_dataset: getMetadataText(metadataObject, 'source_dataset'),
    source_url:
      getMetadataText(metadataObject, 'source_url') ??
      getMetadataText(metadataObject, 'source_item_url') ??
      getMetadataText(metadataObject, 'source_resource_url') ??
      getMetadataText(metadataObject, 'source_download_url') ??
      getMetadataText(metadataObject, 'source_service_url') ??
      getMetadataText(metadataObject, 'website') ??
      getMetadataText(metadataObject, 'link_1') ??
      getMetadataText(metadataObject, 'link_2'),
    source_license_key: buildSourceLicenseKey(importedRecord, metadataObject),
    source_attribution_text: buildSourceAttribution(importedRecord, metadataObject),
    source_updated_at:
      getMetadataText(metadataObject, 'source_updated_at') ??
      getMetadataText(metadataObject, 'source_timestamp') ??
      getMetadataText(metadataObject, 'last_edited_at'),
    raw_payload: rawPayload,
    raw_payload_hash: createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex'),
    import_run_id: importRunId,
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildPostgrestInFilter(values: string[]): string {
  return `in.(${values.map((value) => JSON.stringify(value)).join(',')})`;
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
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase REST request failed (${response.status}): ${responseBody}`);
  }

  if (response.status === 204 || responseBody.trim().length === 0) {
    return [] as T;
  }

  try {
    return JSON.parse(responseBody) as T;
  } catch (error) {
    throw new Error(
      `Supabase REST request returned invalid JSON (${response.status}) for ${requestUrl.toString()}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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

async function createImportRun(
  restContext: SupabaseRestContext,
  options: {
    sourceKey: string;
    sourceDataset: string | null;
    totalRecords: number;
    rawArtifactPath: string | null;
    normalizedArtifactPath: string | null;
    rawArtifactHash: string | null;
    normalizedArtifactHash: string;
  }
): Promise<SourceImportRunRow> {
  const requestUrl = new URL(`${restContext.restUrl}/bathroom_source_import_runs`);
  requestUrl.searchParams.set('select', 'id');

  const insertedRows = await requestJson<SourceImportRunRow[]>(requestUrl, {
    method: 'POST',
    headers: {
      ...restContext.headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      source_key: options.sourceKey,
      source_dataset: options.sourceDataset,
      status: 'pending',
      total_records: options.totalRecords,
      raw_artifact_path: options.rawArtifactPath,
      normalized_artifact_path: options.normalizedArtifactPath,
      raw_artifact_hash: options.rawArtifactHash,
      normalized_artifact_hash: options.normalizedArtifactHash,
    }),
  });

  const importRun = insertedRows[0];

  if (!importRun) {
    throw new Error('Supabase import run insert succeeded but returned no row.');
  }

  return importRun;
}

async function updateImportRun(
  restContext: SupabaseRestContext,
  importRunId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const requestUrl = new URL(`${restContext.restUrl}/bathroom_source_import_runs`);
  requestUrl.searchParams.set('id', `eq.${importRunId}`);

  const response = await fetch(requestUrl, {
    method: 'PATCH',
    headers: {
      ...restContext.headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      ...patch,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Unable to update import run ${importRunId}: ${responseBody}`);
  }
}

async function fetchExistingSourceRecords(
  restContext: SupabaseRestContext,
  importedRecords: ImportedPublicBathroomRecord[]
): Promise<SourceRecordLookupRow[]> {
  if (importedRecords.length === 0) {
    return [];
  }

  const sourceKeys = new Map<string, string[]>();

  for (const importedRecord of importedRecords) {
    const sourceKey = buildSourceKey(importedRecord);
    const externalSourceIds = sourceKeys.get(sourceKey) ?? [];
    externalSourceIds.push(importedRecord.external_source_id);
    sourceKeys.set(sourceKey, externalSourceIds);
  }

  const existingRows = new Map<string, SourceRecordLookupRow>();

  for (const [sourceKey, externalSourceIds] of sourceKeys.entries()) {
    const uniqueIds = [...new Set(externalSourceIds)];

    for (const idChunk of chunkArray(uniqueIds, UPSERT_BATCH_SIZE)) {
      const requestUrl = new URL(`${restContext.restUrl}/bathroom_source_records`);
      requestUrl.searchParams.set('select', 'id,source_key,external_source_id');
      requestUrl.searchParams.set('source_key', `eq.${sourceKey}`);
      requestUrl.searchParams.set('external_source_id', buildPostgrestInFilter(idChunk));

      const chunkRows = await requestJson<SourceRecordLookupRow[]>(requestUrl, {
        method: 'GET',
        headers: restContext.headers,
      });

      for (const row of chunkRows) {
        existingRows.set(`${row.source_key}:${row.external_source_id}`, row);
      }
    }
  }

  return Array.from(existingRows.values());
}

async function upsertSourceRecords(
  restContext: SupabaseRestContext,
  payloads: SourceRecordUpsertPayload[]
): Promise<void> {
  for (const payloadChunk of chunkArray(payloads, UPSERT_BATCH_SIZE)) {
    const requestUrl = new URL(`${restContext.restUrl}/bathroom_source_records`);
    requestUrl.searchParams.set('on_conflict', 'source_key,external_source_id');

    await requestJson<SourceRecordLookupRow[]>(requestUrl, {
      method: 'POST',
      headers: {
        ...restContext.headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payloadChunk),
    });
  }
}

async function reconcileSourceRecords(
  restContext: SupabaseRestContext,
  importedRecords: ImportedPublicBathroomRecord[]
): Promise<ReconcileResultRow[]> {
  const groupedIds = new Map<string, string[]>();

  for (const importedRecord of importedRecords) {
    const sourceKey = buildSourceKey(importedRecord);
    const ids = groupedIds.get(sourceKey) ?? [];
    ids.push(importedRecord.external_source_id);
    groupedIds.set(sourceKey, ids);
  }

  const results: ReconcileResultRow[] = [];

  for (const [sourceKey, externalSourceIds] of groupedIds.entries()) {
    const uniqueIds = [...new Set(externalSourceIds)];

    for (const idChunk of chunkArray(uniqueIds, UPSERT_BATCH_SIZE)) {
      const requestUrl = new URL(`${restContext.restUrl}/rpc/reconcile_bathroom_source_records`);
      const chunkResults = await requestJson<ReconcileResultRow[]>(requestUrl, {
        method: 'POST',
        headers: restContext.headers,
        body: JSON.stringify({
          p_source_key: sourceKey,
          p_external_source_ids: idChunk,
        }),
      });

      results.push(...chunkResults);
    }
  }

  return results;
}

async function applySourceRecords(
  restContext: SupabaseRestContext,
  importedRecords: ImportedPublicBathroomRecord[],
  artifactPaths: {
    inputPath: string;
    normalizedPath: string;
    rawArtifactInputPath: string | null;
    rawArtifactPath: string | null;
    normalizedArtifactPath: string | null;
  }
): Promise<ApplySummary> {
  if (importedRecords.length === 0) {
    throw new Error('No imported records were available to apply.');
  }

  const existingRows = await fetchExistingSourceRecords(restContext, importedRecords);
  const existingKeys = new Set(existingRows.map((row) => `${row.source_key}:${row.external_source_id}`));
  const metadataObject = asJsonObject(importedRecords[0]?.archetype_metadata);
  const sourceKey = buildSourceKey(importedRecords[0]);
  const sourceDataset = getMetadataText(metadataObject, 'source_dataset');
  const rawArtifactHashSourcePath = artifactPaths.rawArtifactInputPath ?? artifactPaths.inputPath;
  const rawArtifactHash = createHash('sha256').update(await readFile(rawArtifactHashSourcePath, 'utf8')).digest('hex');
  const normalizedArtifactHash = createHash('sha256')
    .update(await readFile(artifactPaths.normalizedPath, 'utf8'))
    .digest('hex');
  const importRun = await createImportRun(restContext, {
    sourceKey,
    sourceDataset,
    totalRecords: importedRecords.length,
    rawArtifactPath: artifactPaths.rawArtifactPath ?? artifactPaths.inputPath,
    normalizedArtifactPath: artifactPaths.normalizedArtifactPath ?? artifactPaths.normalizedPath,
    rawArtifactHash,
    normalizedArtifactHash,
  });

  try {
    const payloads = importedRecords.map((record) => buildSourceRecordPayload(record, importRun.id));
    await upsertSourceRecords(restContext, payloads);
    const reconcileResults = await reconcileSourceRecords(restContext, importedRecords);
    const inserted = importedRecords.filter(
      (record) => !existingKeys.has(`${buildSourceKey(record)}:${record.external_source_id}`)
    ).length;
    const updated = importedRecords.length - inserted;
    const linked = reconcileResults.filter((result) => result.status === 'linked' || result.action === 'already_linked').length;
    const promoted = reconcileResults.filter((result) => result.status === 'promoted').length;

    await updateImportRun(restContext, importRun.id, {
      status: 'applied',
      inserted_records: inserted,
      updated_records: updated,
      linked_records: linked,
      promoted_records: promoted,
      completed_at: new Date().toISOString(),
    });

    return {
      importRunId: importRun.id,
      inserted,
      updated,
      linked,
      promoted,
    };
  } catch (error) {
    await updateImportRun(restContext, importRun.id, {
      status: 'failed',
      operator_notes: error instanceof Error ? error.message : String(error),
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
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
  const applySummary = await applySourceRecords(restContext, parseResult.records, {
    inputPath,
    normalizedPath: outputPath,
    rawArtifactInputPath: options.artifactRawInputPath,
    rawArtifactPath: options.artifactRawPath,
    normalizedArtifactPath: options.artifactNormalizedPath,
  });

  console.log(
    `Applied to source records. Import run ${applySummary.importRunId} inserted ${applySummary.inserted}, updated ${applySummary.updated}, linked ${applySummary.linked}, and promoted ${applySummary.promoted}.`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
