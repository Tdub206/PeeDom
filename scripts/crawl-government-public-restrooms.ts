import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const {
  buildDefaultRunLabel,
  mergeImportedPublicBathroomParseResults,
} = (await import(
  new URL('../src/lib/import/government-open-data.ts', import.meta.url).href
)) as typeof import('../src/lib/import/government-open-data');
const { parseNormalizedPublicBathroomImport } = (await import(
  new URL('../src/lib/import/public-restroom-import.ts', import.meta.url).href
)) as typeof import('../src/lib/import/public-restroom-import');

interface CliOptions {
  runLabel: string;
  outputPath: string | null;
  manifestPath: string | null;
  connectors: string[] | null;
  apply: boolean;
}

interface ConnectorRunResult {
  connector: string;
  normalized_output_path: string;
  manifest_path: string;
}

interface GovernmentDiscoveryManifest {
  run_label: string;
  generated_at: string;
  connectors: ConnectorRunResult[];
  summary: {
    connector_runs: number;
    normalized_records: number;
    skipped_records: number;
    total_features: number;
  };
}

const SUPPORTED_CONNECTORS = ['arcgis', 'socrata', 'ckan'] as const;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    runLabel: buildDefaultRunLabel(),
    outputPath: null,
    manifestPath: null,
    connectors: null,
    apply: false,
  };

  for (const argument of argv.slice(2)) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }

    if (argument.startsWith('--run-label=')) {
      options.runLabel = argument.slice('--run-label='.length).trim();
      continue;
    }

    if (argument.startsWith('--output=')) {
      options.outputPath = argument.slice('--output='.length).trim();
      continue;
    }

    if (argument.startsWith('--manifest=')) {
      options.manifestPath = argument.slice('--manifest='.length).trim();
      continue;
    }

    if (argument.startsWith('--connectors=')) {
      const connectors = argument
        .slice('--connectors='.length)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);
      options.connectors = connectors.length > 0 ? connectors : null;
    }
  }

  return options;
}

function buildDefaultOutputPath(workspaceRoot: string, runLabel: string): string {
  return path.join(
    workspaceRoot,
    'PublicRestroomData',
    'government-open-data',
    'runs',
    runLabel,
    'normalized',
    'government-open-data.stallpass-import.json'
  );
}

function buildDefaultManifestPath(workspaceRoot: string, runLabel: string): string {
  return path.join(
    workspaceRoot,
    'PublicRestroomData',
    'government-open-data',
    'runs',
    runLabel,
    'government-open-data.manifest.json'
  );
}

function buildConnectorPaths(
  workspaceRoot: string,
  runLabel: string,
  connector: string
): ConnectorRunResult & { raw_directory: string } {
  const connectorRoot = path.join(
    workspaceRoot,
    'PublicRestroomData',
    'government-open-data',
    'runs',
    runLabel,
    'connectors',
    connector
  );

  return {
    connector,
    raw_directory: path.join(connectorRoot, 'raw'),
    normalized_output_path: path.join(connectorRoot, 'normalized', `${connector}-open-data.stallpass-import.json`),
    manifest_path: path.join(connectorRoot, `${connector}-open-data.manifest.json`),
  };
}

function resolveConnectors(requested: string[] | null): string[] {
  if (!requested || requested.length === 0) {
    return [...SUPPORTED_CONNECTORS];
  }

  const filteredConnectors = requested.filter((connector) =>
    SUPPORTED_CONNECTORS.includes(connector as (typeof SUPPORTED_CONNECTORS)[number])
  );

  if (filteredConnectors.length === 0) {
    throw new Error(`No supported connectors were requested. Supported connectors: ${SUPPORTED_CONNECTORS.join(', ')}`);
  }

  return filteredConnectors;
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

function buildConnectorScriptPath(workspaceRoot: string, connector: string): string {
  switch (connector) {
    case 'arcgis':
      return path.join(workspaceRoot, 'scripts', 'crawl-arcgis-public-restrooms.ts');
    case 'socrata':
      return path.join(workspaceRoot, 'scripts', 'crawl-socrata-public-restrooms.ts');
    case 'ckan':
      return path.join(workspaceRoot, 'scripts', 'crawl-ckan-public-restrooms.ts');
    default:
      throw new Error(`Unsupported connector "${connector}".`);
  }
}

async function applyMergedArtifact(
  workspaceRoot: string,
  outputPath: string,
  manifestPath: string
): Promise<void> {
  const importScriptPath = path.join(workspaceRoot, 'scripts', 'import-public-restrooms.ts');
  await runNodeTypescriptScript(importScriptPath, [
    '--source=normalized-json',
    `--input=${outputPath}`,
    '--apply',
    `--artifact-raw-input=${manifestPath}`,
    `--artifact-raw-path=${manifestPath}`,
    `--artifact-normalized-path=${outputPath}`,
  ]);
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const options = parseArgs(process.argv);
  const connectors = resolveConnectors(options.connectors);
  const outputPath = options.outputPath ?? buildDefaultOutputPath(workspaceRoot, options.runLabel);
  const manifestPath = options.manifestPath ?? buildDefaultManifestPath(workspaceRoot, options.runLabel);
  const connectorResults: ConnectorRunResult[] = [];

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  for (const connector of connectors) {
    const connectorPaths = buildConnectorPaths(workspaceRoot, options.runLabel, connector);
    const scriptPath = buildConnectorScriptPath(workspaceRoot, connector);

    console.log(`Running government connector: ${connector}`);
    await mkdir(connectorPaths.raw_directory, { recursive: true });
    await mkdir(path.dirname(connectorPaths.normalized_output_path), { recursive: true });
    await mkdir(path.dirname(connectorPaths.manifest_path), { recursive: true });
    await runNodeTypescriptScript(scriptPath, [
      `--run-label=${options.runLabel}`,
      `--output=${connectorPaths.normalized_output_path}`,
      `--raw-dir=${connectorPaths.raw_directory}`,
      `--manifest=${connectorPaths.manifest_path}`,
    ]);

    connectorResults.push({
      connector,
      normalized_output_path: connectorPaths.normalized_output_path,
      manifest_path: connectorPaths.manifest_path,
    });
  }

  const parseResults = await Promise.all(
    connectorResults.map(async (result) =>
      parseNormalizedPublicBathroomImport(await readFile(result.normalized_output_path, 'utf8'))
    )
  );
  const mergedResult = mergeImportedPublicBathroomParseResults(parseResults);

  await writeFile(outputPath, JSON.stringify(mergedResult, null, 2));

  const manifest: GovernmentDiscoveryManifest = {
    run_label: options.runLabel,
    generated_at: new Date().toISOString(),
    connectors: connectorResults,
    summary: {
      connector_runs: connectorResults.length,
      normalized_records: mergedResult.summary.included_records,
      skipped_records: mergedResult.summary.skipped_records,
      total_features: mergedResult.summary.total_features,
    },
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Merged government-open-data records: ${mergedResult.summary.included_records}`);
  console.log(`Government manifest written to ${manifestPath}`);
  console.log(`Government normalized output written to ${outputPath}`);

  if (options.apply) {
    await applyMergedArtifact(workspaceRoot, outputPath, manifestPath);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
