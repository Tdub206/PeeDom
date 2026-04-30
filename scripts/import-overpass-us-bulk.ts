import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const {
  buildDefaultOverpassRunLabel,
  buildOverpassArtifactManifest,
  buildOverpassBulkImportPaths,
  buildSupabaseStorageUri,
  extractStateCodeFromArtifactFileName,
  OVERPASS_IMPORT_ARTIFACT_BUCKET,
} = (await import(
  new URL('../src/lib/import/overpass-bulk-import.ts', import.meta.url).href
)) as typeof import('../src/lib/import/overpass-bulk-import');
type OverpassArtifactManifest = import('../src/lib/import/overpass-bulk-import').OverpassArtifactManifest;
type OverpassNormalizedArtifactManifestEntry =
  import('../src/lib/import/overpass-bulk-import').OverpassNormalizedArtifactManifestEntry;
type OverpassRawArtifactManifestEntry =
  import('../src/lib/import/overpass-bulk-import').OverpassRawArtifactManifestEntry;

interface CliOptions {
  apply: boolean;
  refresh: boolean;
  includeExpandedTextMatches: boolean;
  stateCodes: string[] | null;
  delayMs: number | null;
  timeoutSeconds: number | null;
  endpoint: string | null;
  runLabel: string | null;
  storageBucket: string;
}

interface RawArtifactFile {
  fileName: string;
  localPath: string;
  sha256: string;
  sizeBytes: number;
  stateCode: string | null;
}

const DEFAULT_STORAGE_BUCKET = OVERPASS_IMPORT_ARTIFACT_BUCKET;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    refresh: false,
    includeExpandedTextMatches: true,
    stateCodes: null,
    delayMs: null,
    timeoutSeconds: null,
    endpoint: null,
    runLabel: null,
    storageBucket: DEFAULT_STORAGE_BUCKET,
  };

  for (const argument of argv.slice(2)) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }

    if (argument === '--refresh') {
      options.refresh = true;
      continue;
    }

    if (argument === '--canonical-only') {
      options.includeExpandedTextMatches = false;
      continue;
    }

    if (argument.startsWith('--states=')) {
      const values = argument
        .slice('--states='.length)
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0);
      options.stateCodes = values.length > 0 ? values : null;
      continue;
    }

    if (argument.startsWith('--delay-ms=')) {
      options.delayMs = Number.parseInt(argument.slice('--delay-ms='.length).trim(), 10);
      continue;
    }

    if (argument.startsWith('--timeout-seconds=')) {
      options.timeoutSeconds = Number.parseInt(argument.slice('--timeout-seconds='.length).trim(), 10);
      continue;
    }

    if (argument.startsWith('--endpoint=')) {
      options.endpoint = argument.slice('--endpoint='.length).trim();
      continue;
    }

    if (argument.startsWith('--run-label=')) {
      options.runLabel = argument.slice('--run-label='.length).trim();
      continue;
    }

    if (argument.startsWith('--storage-bucket=')) {
      options.storageBucket = argument.slice('--storage-bucket='.length).trim();
    }
  }

  return options;
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function hashFile(filePath: string): Promise<string> {
  return hashBuffer(await readFile(filePath));
}

async function collectRawArtifactFiles(rawDirectory: string): Promise<RawArtifactFile[]> {
  const entries = await readdir(rawDirectory, { withFileTypes: true });
  const rawFileEntries = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.overpass.json'))
    .sort((leftItem, rightItem) => leftItem.name.localeCompare(rightItem.name));

  if (rawFileEntries.length === 0) {
    throw new Error(`No raw Overpass state files were found in ${rawDirectory}.`);
  }

  return Promise.all(
    rawFileEntries.map(async (entry) => {
      const localPath = path.join(rawDirectory, entry.name);
      const [fileHash, fileStats] = await Promise.all([hashFile(localPath), stat(localPath)]);

      return {
        fileName: entry.name,
        localPath,
        sha256: fileHash,
        sizeBytes: fileStats.size,
        stateCode: extractStateCodeFromArtifactFileName(entry.name),
      };
    })
  );
}

async function buildManifest(
  rawDirectory: string,
  normalizedOutputPath: string,
  options: CliOptions,
  storageStateFiles: Map<string, string> | null,
  normalizedStorageUri: string | null,
  storageBucket: string | null,
  storagePrefix: string | null,
  runLabel: string
): Promise<OverpassArtifactManifest> {
  const rawFiles = await collectRawArtifactFiles(rawDirectory);
  const normalizedStats = await stat(normalizedOutputPath);
  const normalizedArtifact: OverpassNormalizedArtifactManifestEntry = {
    file_name: path.basename(normalizedOutputPath),
    local_path: normalizedOutputPath,
    storage_uri: normalizedStorageUri,
    sha256: await hashFile(normalizedOutputPath),
    size_bytes: normalizedStats.size,
  };
  const rawStateFiles: OverpassRawArtifactManifestEntry[] = rawFiles.map((rawFile) => ({
    file_name: rawFile.fileName,
    state_code: rawFile.stateCode,
    local_path: rawFile.localPath,
    storage_uri: storageStateFiles?.get(rawFile.fileName) ?? null,
    sha256: rawFile.sha256,
    size_bytes: rawFile.sizeBytes,
  }));

  return buildOverpassArtifactManifest({
    runLabel,
    generatedAt: new Date().toISOString(),
    storageBucket,
    storagePrefix,
    statesRequested: options.stateCodes,
    includeExpandedTextMatches: options.includeExpandedTextMatches,
    refreshRequested: options.refresh,
    endpoint: options.endpoint,
    rawDirectory,
    normalizedOutputPath,
    rawStateFiles,
    normalizedArtifact,
  });
}

async function writeManifest(manifestPath: string, manifest: OverpassArtifactManifest): Promise<void> {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function runNodeTypescriptScript(scriptPath: string, scriptArgs: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const childProcess = spawn(process.execPath, ['--experimental-strip-types', scriptPath, ...scriptArgs], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    childProcess.once('error', reject);
    childProcess.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Script ${path.basename(scriptPath)} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function buildFetchArgs(paths: ReturnType<typeof buildOverpassBulkImportPaths>, options: CliOptions): string[] {
  const args = [`--output=${paths.normalizedOutputPath}`, `--raw-dir=${paths.rawDirectory}`];

  if (options.stateCodes && options.stateCodes.length > 0) {
    args.push(`--states=${options.stateCodes.join(',')}`);
  }

  if (options.refresh) {
    args.push('--refresh');
  }

  if (!options.includeExpandedTextMatches) {
    args.push('--canonical-only');
  }

  if (options.delayMs !== null) {
    args.push(`--delay-ms=${options.delayMs}`);
  }

  if (options.timeoutSeconds !== null) {
    args.push(`--timeout-seconds=${options.timeoutSeconds}`);
  }

  if (options.endpoint) {
    args.push(`--endpoint=${options.endpoint}`);
  }

  return args;
}

function buildImportArgs(
  paths: ReturnType<typeof buildOverpassBulkImportPaths>,
  manifestPath: string,
  manifestStorageUri: string,
  normalizedStorageUri: string
): string[] {
  return [
    '--source=normalized-json',
    `--input=${paths.normalizedOutputPath}`,
    '--apply',
    `--artifact-raw-input=${manifestPath}`,
    `--artifact-raw-path=${manifestStorageUri}`,
    `--artifact-normalized-path=${normalizedStorageUri}`,
  ];
}

async function ensureStorageBucket(
  supabaseUrl: string,
  serviceRoleKey: string,
  bucketName: string
): Promise<void> {
  const storageClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: buckets, error: listError } = await storageClient.storage.listBuckets();

  if (listError) {
    throw new Error(`Unable to inspect Supabase storage buckets: ${listError.message}`);
  }

  if (buckets.some((bucket) => bucket.name === bucketName || bucket.id === bucketName)) {
    return;
  }

  const { error: createError } = await storageClient.storage.createBucket(bucketName, {
    public: false,
    allowedMimeTypes: ['application/json'],
  });

  if (createError) {
    throw new Error(`Unable to create Supabase storage bucket "${bucketName}": ${createError.message}`);
  }
}

async function uploadJsonArtifact(
  supabaseUrl: string,
  serviceRoleKey: string,
  bucketName: string,
  objectPath: string,
  localPath: string
): Promise<string> {
  const storageClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const fileBuffer = await readFile(localPath);
  const { error } = await storageClient.storage.from(bucketName).upload(objectPath, fileBuffer, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    throw new Error(`Unable to upload ${localPath} to Supabase Storage: ${error.message}`);
  }

  return buildSupabaseStorageUri(bucketName, objectPath);
}

async function uploadArtifacts(
  supabaseUrl: string,
  serviceRoleKey: string,
  paths: ReturnType<typeof buildOverpassBulkImportPaths>
): Promise<{
  rawStateFiles: Map<string, string>;
  normalizedStorageUri: string;
}> {
  await ensureStorageBucket(supabaseUrl, serviceRoleKey, paths.storageBucket);
  const rawFiles = await collectRawArtifactFiles(paths.rawDirectory);
  const rawStateFiles = new Map<string, string>();

  for (const rawFile of rawFiles) {
    const objectPath = path.posix.join(paths.rawStorageObjectPrefix, rawFile.fileName);
    const storageUri = await uploadJsonArtifact(supabaseUrl, serviceRoleKey, paths.storageBucket, objectPath, rawFile.localPath);
    rawStateFiles.set(rawFile.fileName, storageUri);
  }

  const normalizedStorageUri = await uploadJsonArtifact(
    supabaseUrl,
    serviceRoleKey,
    paths.storageBucket,
    paths.normalizedStorageObjectPath,
    paths.normalizedOutputPath
  );

  return {
    rawStateFiles,
    normalizedStorageUri,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const workspaceRoot = process.cwd();
  const paths = buildOverpassBulkImportPaths(
    workspaceRoot,
    options.runLabel ?? buildDefaultOverpassRunLabel(),
    options.storageBucket
  );
  const fetchScriptPath = path.join(workspaceRoot, 'scripts', 'fetch-overpass-public-restrooms.ts');
  const importScriptPath = path.join(workspaceRoot, 'scripts', 'import-public-restrooms.ts');

  await mkdir(path.dirname(paths.normalizedOutputPath), { recursive: true });
  await mkdir(paths.rawDirectory, { recursive: true });

  console.log(`Run label: ${paths.runLabel}`);
  console.log(`Raw state output: ${paths.rawDirectory}`);
  console.log(`Normalized output: ${paths.normalizedOutputPath}`);

  await runNodeTypescriptScript(fetchScriptPath, buildFetchArgs(paths, options));

  const localManifest = await buildManifest(
    paths.rawDirectory,
    paths.normalizedOutputPath,
    options,
    null,
    null,
    null,
    null,
    paths.runLabel
  );
  await writeManifest(paths.manifestPath, localManifest);
  console.log(`Local manifest written to ${paths.manifestPath}`);

  if (!options.apply) {
    console.log('Dry run complete. Re-run with --apply to upload artifacts and import into Supabase.');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when using --apply.');
  }

  const uploadedArtifacts = await uploadArtifacts(supabaseUrl, serviceRoleKey, paths);
  const storageBackedManifest = await buildManifest(
    paths.rawDirectory,
    paths.normalizedOutputPath,
    options,
    uploadedArtifacts.rawStateFiles,
    uploadedArtifacts.normalizedStorageUri,
    paths.storageBucket,
    paths.storagePrefix,
    paths.runLabel
  );
  await writeManifest(paths.manifestPath, storageBackedManifest);

  const manifestStorageUri = await uploadJsonArtifact(
    supabaseUrl,
    serviceRoleKey,
    paths.storageBucket,
    paths.manifestStorageObjectPath,
    paths.manifestPath
  );

  await runNodeTypescriptScript(
    importScriptPath,
    buildImportArgs(paths, paths.manifestPath, manifestStorageUri, uploadedArtifacts.normalizedStorageUri)
  );

  console.log(`Artifacts uploaded to ${paths.storageBucket}/${paths.storagePrefix}`);
  console.log(`Manifest: ${manifestStorageUri}`);
  console.log(`Normalized import: ${uploadedArtifacts.normalizedStorageUri}`);
  console.log('Supabase source-record import completed.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
