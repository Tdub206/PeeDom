/* eslint-disable no-console */
/**
 * Cold-start OSM geo-seeding script (Guide Section 8).
 *
 * Fetches public bathroom features from OpenStreetMap's Overpass API for the
 * top 20 US metros and upserts them into `public.bathrooms` using the service
 * role key. Dedups on rounded (lat, lon) + normalized name. Respects
 * Overpass's polite-use guidance with a 2-second inter-request sleep.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-osm-bathrooms.ts
 *
 * Flags:
 *   --dry-run   parse + dedupe, log summary, skip inserts
 *   --city=<n>  comma-delimited list of city slugs to limit the run
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface MetroBoundingBox {
  slug: string;
  displayName: string;
  south: number;
  west: number;
  north: number;
  east: number;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface BathroomInsert {
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
  source_type: 'imported';
  access_type: 'public' | 'code' | 'purchase_required' | 'key';
  dedup_key: string;
}

const METROS: MetroBoundingBox[] = [
  { slug: 'nyc', displayName: 'New York City, NY', south: 40.477, west: -74.259, north: 40.917, east: -73.700 },
  { slug: 'la', displayName: 'Los Angeles, CA', south: 33.703, west: -118.668, north: 34.337, east: -118.155 },
  { slug: 'chi', displayName: 'Chicago, IL', south: 41.644, west: -87.940, north: 42.023, east: -87.524 },
  { slug: 'hou', displayName: 'Houston, TX', south: 29.523, west: -95.789, north: 30.110, east: -95.014 },
  { slug: 'phx', displayName: 'Phoenix, AZ', south: 33.291, west: -112.324, north: 33.920, east: -111.926 },
  { slug: 'phi', displayName: 'Philadelphia, PA', south: 39.867, west: -75.280, north: 40.138, east: -74.955 },
  { slug: 'sa', displayName: 'San Antonio, TX', south: 29.184, west: -98.801, north: 29.720, east: -98.287 },
  { slug: 'sd', displayName: 'San Diego, CA', south: 32.534, west: -117.282, north: 33.114, east: -116.907 },
  { slug: 'dal', displayName: 'Dallas, TX', south: 32.617, west: -96.999, north: 32.988, east: -96.466 },
  { slug: 'sj', displayName: 'San Jose, CA', south: 37.124, west: -122.045, north: 37.469, east: -121.589 },
  { slug: 'aus', displayName: 'Austin, TX', south: 30.098, west: -97.938, north: 30.516, east: -97.561 },
  { slug: 'jax', displayName: 'Jacksonville, FL', south: 30.103, west: -81.885, north: 30.586, east: -81.389 },
  { slug: 'sf', displayName: 'San Francisco, CA', south: 37.640, west: -123.014, north: 37.832, east: -122.357 },
  { slug: 'col', displayName: 'Columbus, OH', south: 39.808, west: -83.202, north: 40.157, east: -82.771 },
  { slug: 'ind', displayName: 'Indianapolis, IN', south: 39.632, west: -86.328, north: 39.927, east: -85.935 },
  { slug: 'sea', displayName: 'Seattle, WA', south: 47.491, west: -122.459, north: 47.734, east: -122.224 },
  { slug: 'den', displayName: 'Denver, CO', south: 39.614, west: -105.109, north: 39.914, east: -104.599 },
  { slug: 'was', displayName: 'Washington, DC', south: 38.791, west: -77.119, north: 38.995, east: -76.909 },
  { slug: 'bos', displayName: 'Boston, MA', south: 42.227, west: -71.191, north: 42.397, east: -70.984 },
  { slug: 'atl', displayName: 'Atlanta, GA', south: 33.647, west: -84.551, north: 33.887, east: -84.290 },
];

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const REQUEST_DELAY_MS = 2_000;
const OVERPASS_TIMEOUT_SECONDS = 180;
const BATCH_INSERT_SIZE = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundCoord(value: number, decimals = 5): number {
  const pow = 10 ** decimals;
  return Math.round(value * pow) / pow;
}

function normalizeName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function buildOverpassQuery(bbox: MetroBoundingBox): string {
  const bboxClause = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `
    [out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];
    (
      node["amenity"="toilets"](${bboxClause});
      way["amenity"="toilets"](${bboxClause});
      relation["amenity"="toilets"](${bboxClause});
    );
    out center tags;
  `.trim();
}

async function fetchMetroBathrooms(bbox: MetroBoundingBox): Promise<OverpassElement[]> {
  const body = buildOverpassQuery(bbox);
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(body)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass ${bbox.slug} returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  return Array.isArray(data.elements) ? data.elements : [];
}

function elementToBathroom(element: OverpassElement, bbox: MetroBoundingBox): BathroomInsert | null {
  const lat = element.lat ?? element.center?.lat ?? null;
  const lon = element.lon ?? element.center?.lon ?? null;
  if (lat === null || lon === null) return null;

  const tags = element.tags ?? {};
  const name = tags.name ?? tags.operator ?? `Public Toilets (${bbox.displayName})`;
  const fee = (tags.fee ?? '').toLowerCase();
  const access = (tags.access ?? '').toLowerCase();
  const wheelchair = (tags.wheelchair ?? '').toLowerCase();

  let accessType: BathroomInsert['access_type'] = 'public';
  let isCustomerOnly = false;
  let isLocked: boolean | null = null;

  if (fee === 'yes') {
    accessType = 'purchase_required';
    isCustomerOnly = true;
  }

  if (access === 'customers') {
    accessType = 'purchase_required';
    isCustomerOnly = true;
  }

  if (access === 'private' || access === 'no') {
    accessType = 'key';
    isLocked = true;
  }

  const addressLine1 = [
    tags['addr:housenumber'],
    tags['addr:street'],
  ]
    .filter(Boolean)
    .join(' ') || null;

  const city = tags['addr:city'] ?? bbox.displayName.split(',')[0] ?? null;
  const state = tags['addr:state'] ?? bbox.displayName.split(',')[1]?.trim() ?? null;
  const postalCode = tags['addr:postcode'] ?? null;

  const isAccessible = wheelchair === 'yes' ? true : wheelchair === 'no' ? false : null;
  const dedupKey = `${roundCoord(lat).toFixed(5)}:${roundCoord(lon).toFixed(5)}:${normalizeName(name)}`;

  return {
    place_name: name,
    address_line1: addressLine1,
    city,
    state,
    postal_code: postalCode,
    country_code: 'US',
    latitude: lat,
    longitude: lon,
    is_locked: isLocked,
    is_accessible: isAccessible,
    is_customer_only: isCustomerOnly,
    source_type: 'imported',
    access_type: accessType,
    dedup_key: dedupKey,
  };
}

async function insertBatch(client: SupabaseClient, rows: BathroomInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  // dedup_key is a script-side dedup token, not a real column — strip before insert.
  const payload = rows.map((row) => {
    const rest: Omit<BathroomInsert, 'dedup_key'> & { dedup_key?: string } = { ...row };
    delete rest.dedup_key;
    return rest;
  });

  const { error } = await client.from('bathrooms').insert(payload);

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
  return payload.length;
}

function parseArgs(argv: string[]): { dryRun: boolean; citySlugs: Set<string> | null } {
  let dryRun = false;
  let citySlugs: Set<string> | null = null;
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--city=')) {
      const slugs = arg
        .slice('--city='.length)
        .split(',')
        .map((slug) => slug.trim().toLowerCase())
        .filter((slug) => slug.length > 0);
      citySlugs = new Set(slugs);
    }
  }
  return { dryRun, citySlugs };
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const { dryRun, citySlugs } = parseArgs(process.argv);
  const targets = citySlugs
    ? METROS.filter((metro) => citySlugs.has(metro.slug))
    : METROS;

  if (targets.length === 0) {
    console.warn('No metros selected; exiting.');
    return;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seenKeys = new Set<string>();
  const accumulated: BathroomInsert[] = [];

  for (const metro of targets) {
    console.log(`[${metro.slug}] fetching Overpass data for ${metro.displayName}`);
    try {
      const elements = await fetchMetroBathrooms(metro);
      let metroAdded = 0;
      for (const element of elements) {
        const bathroom = elementToBathroom(element, metro);
        if (!bathroom) continue;
        if (seenKeys.has(bathroom.dedup_key)) continue;
        seenKeys.add(bathroom.dedup_key);
        accumulated.push(bathroom);
        metroAdded += 1;
      }
      console.log(`[${metro.slug}] queued ${metroAdded} unique bathrooms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${metro.slug}] error: ${message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Collected ${accumulated.length} unique bathrooms across ${targets.length} metros`);

  if (dryRun) {
    console.log('Dry run — skipping inserts.');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < accumulated.length; i += BATCH_INSERT_SIZE) {
    const slice = accumulated.slice(i, i + BATCH_INSERT_SIZE);
    try {
      const count = await insertBatch(client, slice);
      inserted += count;
      console.log(`Inserted ${inserted}/${accumulated.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Batch starting at ${i} failed: ${message}`);
    }
  }

  console.log(`Done. Inserted ${inserted} bathrooms.`);
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
