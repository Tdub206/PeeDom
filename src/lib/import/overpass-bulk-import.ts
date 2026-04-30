import path from 'node:path';

export const OVERPASS_SOURCE_KEY = 'osm-overpass-us';
export const OVERPASS_IMPORT_ARTIFACT_BUCKET = 'source-import-artifacts';
export const OVERPASS_NORMALIZED_FILE_NAME = 'osm-overpass-us.stallpass-import.json';
export const OVERPASS_MANIFEST_FILE_NAME = 'osm-overpass-us.manifest.json';

export interface OverpassBulkImportPaths {
  runLabel: string;
  runRootDirectory: string;
  rawDirectory: string;
  normalizedOutputPath: string;
  manifestPath: string;
  storageBucket: string;
  storagePrefix: string;
  rawStorageObjectPrefix: string;
  normalizedStorageObjectPath: string;
  manifestStorageObjectPath: string;
}

export interface OverpassRawArtifactManifestEntry {
  file_name: string;
  state_code: string | null;
  local_path: string;
  storage_uri: string | null;
  sha256: string;
  size_bytes: number;
}

export interface OverpassNormalizedArtifactManifestEntry {
  file_name: string;
  local_path: string;
  storage_uri: string | null;
  sha256: string;
  size_bytes: number;
}

export interface OverpassArtifactManifest {
  artifact_version: 1;
  source_key: typeof OVERPASS_SOURCE_KEY;
  run_label: string;
  generated_at: string;
  storage_bucket: string | null;
  storage_prefix: string | null;
  states_requested: string[] | null;
  include_expanded_text_matches: boolean;
  refresh_requested: boolean;
  endpoint: string | null;
  raw_directory: string;
  normalized_output_path: string;
  raw_state_files: OverpassRawArtifactManifestEntry[];
  normalized_artifact: OverpassNormalizedArtifactManifestEntry;
}

export interface BuildOverpassArtifactManifestOptions {
  runLabel: string;
  generatedAt: string;
  storageBucket: string | null;
  storagePrefix: string | null;
  statesRequested: string[] | null;
  includeExpandedTextMatches: boolean;
  refreshRequested: boolean;
  endpoint: string | null;
  rawDirectory: string;
  normalizedOutputPath: string;
  rawStateFiles: OverpassRawArtifactManifestEntry[];
  normalizedArtifact: OverpassNormalizedArtifactManifestEntry;
}

export function sanitizeRunLabel(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildDefaultOverpassRunLabel(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildSupabaseStorageUri(bucket: string, objectPath: string): string {
  return `supabase://${bucket}/${objectPath}`;
}

export function buildOverpassBulkImportPaths(
  workspaceRoot: string,
  runLabel: string,
  storageBucket = OVERPASS_IMPORT_ARTIFACT_BUCKET
): OverpassBulkImportPaths {
  const safeRunLabel = sanitizeRunLabel(runLabel) || buildDefaultOverpassRunLabel();
  const runRootDirectory = path.join(workspaceRoot, 'PublicRestroomData', 'overpass-us', 'runs', safeRunLabel);
  const storagePrefix = path.posix.join(OVERPASS_SOURCE_KEY, safeRunLabel);

  return {
    runLabel: safeRunLabel,
    runRootDirectory,
    rawDirectory: path.join(runRootDirectory, 'raw'),
    normalizedOutputPath: path.join(runRootDirectory, 'normalized', OVERPASS_NORMALIZED_FILE_NAME),
    manifestPath: path.join(runRootDirectory, OVERPASS_MANIFEST_FILE_NAME),
    storageBucket,
    storagePrefix,
    rawStorageObjectPrefix: path.posix.join(storagePrefix, 'raw'),
    normalizedStorageObjectPath: path.posix.join(storagePrefix, 'normalized', OVERPASS_NORMALIZED_FILE_NAME),
    manifestStorageObjectPath: path.posix.join(storagePrefix, 'manifest', OVERPASS_MANIFEST_FILE_NAME),
  };
}

export function extractStateCodeFromArtifactFileName(fileName: string): string | null {
  const match = /^US-([A-Z]{2})\.overpass\.json$/i.exec(fileName.trim());
  return match?.[1]?.toUpperCase() ?? null;
}

export function buildOverpassArtifactManifest(
  options: BuildOverpassArtifactManifestOptions
): OverpassArtifactManifest {
  const rawStateFiles = [...options.rawStateFiles].sort((leftItem, rightItem) =>
    leftItem.file_name.localeCompare(rightItem.file_name)
  );

  return {
    artifact_version: 1,
    source_key: OVERPASS_SOURCE_KEY,
    run_label: sanitizeRunLabel(options.runLabel) || buildDefaultOverpassRunLabel(),
    generated_at: options.generatedAt,
    storage_bucket: options.storageBucket,
    storage_prefix: options.storagePrefix,
    states_requested: options.statesRequested ? [...options.statesRequested] : null,
    include_expanded_text_matches: options.includeExpandedTextMatches,
    refresh_requested: options.refreshRequested,
    endpoint: options.endpoint,
    raw_directory: options.rawDirectory,
    normalized_output_path: options.normalizedOutputPath,
    raw_state_files: rawStateFiles,
    normalized_artifact: options.normalizedArtifact,
  };
}
