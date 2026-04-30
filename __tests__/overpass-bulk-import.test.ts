import path from 'node:path';
import {
  buildDefaultOverpassRunLabel,
  buildOverpassArtifactManifest,
  buildOverpassBulkImportPaths,
  buildSupabaseStorageUri,
  extractStateCodeFromArtifactFileName,
  sanitizeRunLabel,
} from '@/lib/import/overpass-bulk-import';

describe('overpass bulk import helpers', () => {
  it('sanitizes run labels and builds stable run paths', () => {
    const paths = buildOverpassBulkImportPaths('C:\\Users\\T\\Desktop\\PeeDom', ' 2026/04/29 west coast ');

    expect(sanitizeRunLabel(' 2026/04/29 west coast ')).toBe('2026-04-29-west-coast');
    expect(paths.runLabel).toBe('2026-04-29-west-coast');
    expect(paths.rawDirectory).toBe(
      path.join('C:\\Users\\T\\Desktop\\PeeDom', 'PublicRestroomData', 'overpass-us', 'runs', '2026-04-29-west-coast', 'raw')
    );
    expect(paths.normalizedStorageObjectPath).toBe(
      'osm-overpass-us/2026-04-29-west-coast/normalized/osm-overpass-us.stallpass-import.json'
    );
    expect(paths.manifestStorageObjectPath).toBe(
      'osm-overpass-us/2026-04-29-west-coast/manifest/osm-overpass-us.manifest.json'
    );
  });

  it('builds deterministic storage uris and manifest output', () => {
    const manifest = buildOverpassArtifactManifest({
      runLabel: 'pilot-run',
      generatedAt: '2026-04-29T12:00:00.000Z',
      storageBucket: 'source-import-artifacts',
      storagePrefix: 'osm-overpass-us/pilot-run',
      statesRequested: ['WA', 'OR'],
      includeExpandedTextMatches: true,
      refreshRequested: false,
      endpoint: 'https://overpass-api.de/api/interpreter',
      rawDirectory: 'C:\\raw',
      normalizedOutputPath: 'C:\\normalized\\osm-overpass-us.stallpass-import.json',
      rawStateFiles: [
        {
          file_name: 'US-OR.overpass.json',
          state_code: 'OR',
          local_path: 'C:\\raw\\US-OR.overpass.json',
          storage_uri: buildSupabaseStorageUri(
            'source-import-artifacts',
            'osm-overpass-us/pilot-run/raw/US-OR.overpass.json'
          ),
          sha256: 'hash-or',
          size_bytes: 200,
        },
        {
          file_name: 'US-WA.overpass.json',
          state_code: 'WA',
          local_path: 'C:\\raw\\US-WA.overpass.json',
          storage_uri: buildSupabaseStorageUri(
            'source-import-artifacts',
            'osm-overpass-us/pilot-run/raw/US-WA.overpass.json'
          ),
          sha256: 'hash-wa',
          size_bytes: 100,
        },
      ],
      normalizedArtifact: {
        file_name: 'osm-overpass-us.stallpass-import.json',
        local_path: 'C:\\normalized\\osm-overpass-us.stallpass-import.json',
        storage_uri: buildSupabaseStorageUri(
          'source-import-artifacts',
          'osm-overpass-us/pilot-run/normalized/osm-overpass-us.stallpass-import.json'
        ),
        sha256: 'hash-normalized',
        size_bytes: 300,
      },
    });

    expect(manifest.run_label).toBe('pilot-run');
    expect(manifest.raw_state_files.map((item) => item.file_name)).toEqual([
      'US-OR.overpass.json',
      'US-WA.overpass.json',
    ]);
    expect(manifest.normalized_artifact.storage_uri).toBe(
      'supabase://source-import-artifacts/osm-overpass-us/pilot-run/normalized/osm-overpass-us.stallpass-import.json'
    );
  });

  it('extracts state codes from raw artifact names and builds default labels', () => {
    const runLabel = buildDefaultOverpassRunLabel(new Date('2026-04-29T12:34:56.789Z'));

    expect(extractStateCodeFromArtifactFileName('US-WA.overpass.json')).toBe('WA');
    expect(extractStateCodeFromArtifactFileName('bad-file-name.json')).toBeNull();
    expect(runLabel).toBe('20260429T123456Z');
  });
});
