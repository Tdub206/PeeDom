import { z } from 'zod';
import type { BathroomFilters, BathroomListItem, DownloadedPremiumCityPack, PremiumCityPackManifest, RegionBounds, Database } from '@/types';
import { premiumCityPackManifestSchema, publicBathroomDetailRowSchema } from '@/lib/supabase-parsers';
import { storage } from '@/lib/storage';
import { applyBathroomFilters, calculateDistanceMeters, getRegionBounds, mapBathroomRowToListItem } from '@/utils/bathroom';

type CityPackBathroomRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

interface StoredPremiumCityPackRecord {
  manifest: PremiumCityPackManifest;
  bathrooms: CityPackBathroomRow[];
  downloaded_at: string;
}

interface StoredPremiumCityPackIndexEntry {
  manifest: PremiumCityPackManifest;
  downloaded_at: string;
  search_text: string;
}

const isoTimestampSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO-compatible timestamp.');

const downloadedCityPackSchema = z.object({
  manifest: premiumCityPackManifestSchema,
  downloaded_at: isoTimestampSchema,
  search_text: z.string().optional().default(''),
});

const downloadedCityPackListSchema = z.array(downloadedCityPackSchema);

const storedPremiumCityPackRecordSchema = z.object({
  manifest: premiumCityPackManifestSchema,
  bathrooms: z.array(publicBathroomDetailRowSchema),
  downloaded_at: isoTimestampSchema,
});

function getCityPackStorageKey(slug: string): string {
  return `${storage.keys.PREMIUM_CITY_PACK_PREFIX}:${slug}`;
}

function doesPackIntersectRegion(pack: PremiumCityPackManifest, region: RegionBounds): boolean {
  const bounds = getRegionBounds(region);

  return !(
    pack.max_latitude < bounds.minLatitude ||
    pack.min_latitude > bounds.maxLatitude ||
    pack.max_longitude < bounds.minLongitude ||
    pack.min_longitude > bounds.maxLongitude
  );
}

function isBathroomInsideRegion(bathroom: CityPackBathroomRow, region: RegionBounds): boolean {
  const bounds = getRegionBounds(region);

  return (
    bathroom.latitude >= bounds.minLatitude &&
    bathroom.latitude <= bounds.maxLatitude &&
    bathroom.longitude >= bounds.minLongitude &&
    bathroom.longitude <= bounds.maxLongitude
  );
}

function normalizeSearchText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function tokenizeSearchText(value: string | null | undefined): string[] {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function readJsonBooleanFlag(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (value as Record<string, unknown>)[key] === true;
}

function buildPackSearchText(manifest: PremiumCityPackManifest, bathrooms: CityPackBathroomRow[]): string {
  const tokens = new Set<string>();

  [
    manifest.slug,
    manifest.city,
    manifest.state,
    manifest.country_code,
    ...bathrooms.flatMap((bathroom) => [
      bathroom.place_name,
      bathroom.address_line1,
      bathroom.city,
      bathroom.state,
      bathroom.postal_code,
      bathroom.is_accessible ? 'accessible wheelchair' : null,
      readJsonBooleanFlag(bathroom.accessibility_features, 'has_changing_table')
        ? 'changing table caregiver family child'
        : null,
      readJsonBooleanFlag(bathroom.accessibility_features, 'is_family_restroom')
        ? 'family restroom child caregiver'
        : null,
      readJsonBooleanFlag(bathroom.accessibility_features, 'is_gender_neutral')
        ? 'gender neutral single user privacy'
        : null,
      bathroom.is_locked === false ? 'unlocked no code public' : null,
      bathroom.is_customer_only ? 'customer only' : null,
    ]),
  ].forEach((value) => {
    tokenizeSearchText(value).forEach((token) => tokens.add(token));
  });

  return Array.from(tokens).sort().join(' ');
}

function doesPackIndexMatchQuery(entry: StoredPremiumCityPackIndexEntry, query: string): boolean {
  const queryTokens = tokenizeSearchText(query);

  if (queryTokens.length === 0 || !entry.search_text) {
    return true;
  }

  return queryTokens.every((token) => entry.search_text.includes(token));
}

function scoreBathroomAgainstQuery(bathroom: CityPackBathroomRow, query: string): number {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return 1;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const placeName = normalizeSearchText(bathroom.place_name);
  const address = normalizeSearchText(bathroom.address_line1);
  const city = normalizeSearchText(bathroom.city);
  const state = normalizeSearchText(bathroom.state);
  const postalCode = normalizeSearchText(bathroom.postal_code);
  const combined = [placeName, address, city, state, postalCode].filter(Boolean).join(' ');
  let score = 0;

  if (placeName === normalizedQuery) {
    score += 140;
  } else if (placeName.includes(normalizedQuery)) {
    score += 90;
  }

  if (address.includes(normalizedQuery)) {
    score += 55;
  }

  if (city.includes(normalizedQuery) || state.includes(normalizedQuery) || postalCode.includes(normalizedQuery)) {
    score += 35;
  }

  const matchingTokens = queryTokens.filter((token) => combined.includes(token)).length;
  score += matchingTokens * 12;

  return score;
}

class PremiumCityPackStorage {
  private async readIndexRecords(): Promise<StoredPremiumCityPackIndexEntry[]> {
    const storedIndex = await storage.get<unknown>(storage.keys.PREMIUM_CITY_PACK_INDEX);
    const parsedIndex = downloadedCityPackListSchema.safeParse(storedIndex ?? []);

    if (!parsedIndex.success) {
      await storage.remove(storage.keys.PREMIUM_CITY_PACK_INDEX).catch(() => undefined);
      return [];
    }

    return parsedIndex.data.map((entry) => ({
      manifest: entry.manifest,
      downloaded_at: entry.downloaded_at,
      search_text: entry.search_text,
    }));
  }

  private async readIndex(): Promise<DownloadedPremiumCityPack[]> {
    const indexRecords = await this.readIndexRecords();

    return indexRecords.map((entry) => ({
      ...entry.manifest,
      downloaded_at: entry.downloaded_at,
    }));
  }

  private async writeIndexRecords(entries: StoredPremiumCityPackIndexEntry[]): Promise<void> {
    await storage.set(
      storage.keys.PREMIUM_CITY_PACK_INDEX,
      entries.map((entry) => ({
        manifest: {
          slug: entry.manifest.slug,
          city: entry.manifest.city,
          state: entry.manifest.state,
          country_code: entry.manifest.country_code,
          bathroom_count: entry.manifest.bathroom_count,
          center_latitude: entry.manifest.center_latitude,
          center_longitude: entry.manifest.center_longitude,
          min_latitude: entry.manifest.min_latitude,
          max_latitude: entry.manifest.max_latitude,
          min_longitude: entry.manifest.min_longitude,
          max_longitude: entry.manifest.max_longitude,
          latest_bathroom_update_at: entry.manifest.latest_bathroom_update_at,
          latest_code_verified_at: entry.manifest.latest_code_verified_at,
        },
        downloaded_at: entry.downloaded_at,
        search_text: entry.search_text,
      }))
    );
  }

  private async readPack(slug: string): Promise<StoredPremiumCityPackRecord | null> {
    const storedPack = await storage.get<unknown>(getCityPackStorageKey(slug));
    const parsedPack = storedPremiumCityPackRecordSchema.safeParse(storedPack);

    if (!parsedPack.success) {
      if (storedPack) {
        await storage.remove(getCityPackStorageKey(slug)).catch(() => undefined);
      }

      return null;
    }

    return parsedPack.data;
  }

  private async readPacksForIndexEntries(
    entries: StoredPremiumCityPackIndexEntry[]
  ): Promise<StoredPremiumCityPackRecord[]> {
    const packs = await Promise.all(entries.map((entry) => this.readPack(entry.manifest.slug)));
    const validRecords = packs.filter((pack): pack is StoredPremiumCityPackRecord => Boolean(pack));
    const validRecordsBySlug = new Map(validRecords.map((record) => [record.manifest.slug, record]));
    const invalidSlugs = new Set(
      entries
        .map((entry) => entry.manifest.slug)
        .filter((slug) => !validRecordsBySlug.has(slug))
    );
    const missingSearchTextSlugs = new Set(
      entries
        .filter((entry) => !entry.search_text && validRecordsBySlug.has(entry.manifest.slug))
        .map((entry) => entry.manifest.slug)
    );

    if (invalidSlugs.size > 0 || missingSearchTextSlugs.size > 0) {
      const currentIndex = await this.readIndexRecords();
      await this.writeIndexRecords(
        currentIndex
          .filter((entry) => !invalidSlugs.has(entry.manifest.slug))
          .map((entry) => {
            const record = validRecordsBySlug.get(entry.manifest.slug);

            if (!record || entry.search_text) {
              return entry;
            }

            return {
              manifest: record.manifest,
              downloaded_at: record.downloaded_at,
              search_text: buildPackSearchText(record.manifest, record.bathrooms),
            };
          })
      );
    }

    return validRecords;
  }

  async listDownloadedPacks(): Promise<DownloadedPremiumCityPack[]> {
    const packs = await this.readIndex();

    return packs
      .sort((leftPack, rightPack) => rightPack.downloaded_at.localeCompare(leftPack.downloaded_at));
  }

  async savePack(manifest: PremiumCityPackManifest, bathrooms: CityPackBathroomRow[]): Promise<void> {
    const parsedManifest = premiumCityPackManifestSchema.safeParse(manifest);
    const parsedBathrooms = z.array(publicBathroomDetailRowSchema).safeParse(bathrooms);

    if (!parsedManifest.success || !parsedBathrooms.success) {
      throw new Error('The city pack payload was invalid and could not be cached.');
    }

    const downloadedAt = new Date().toISOString();
    const record: StoredPremiumCityPackRecord = {
      manifest: parsedManifest.data,
      bathrooms: parsedBathrooms.data as CityPackBathroomRow[],
      downloaded_at: downloadedAt,
    };

    await storage.set(getCityPackStorageKey(manifest.slug), record);

    const existingIndex = await this.readIndexRecords();
    const nextIndex = [
      ...existingIndex.filter((entry) => entry.manifest.slug !== manifest.slug),
      {
        manifest: parsedManifest.data,
        downloaded_at: downloadedAt,
        search_text: buildPackSearchText(parsedManifest.data, parsedBathrooms.data as CityPackBathroomRow[]),
      },
    ].sort((leftPack, rightPack) => rightPack.downloaded_at.localeCompare(leftPack.downloaded_at));

    await this.writeIndexRecords(nextIndex);
  }

  async removePack(slug: string): Promise<void> {
    await storage.remove(getCityPackStorageKey(slug));
    const existingIndex = await this.readIndexRecords();
    await this.writeIndexRecords(existingIndex.filter((entry) => entry.manifest.slug !== slug));
  }

  async findBathroomsInRegion(
    region: RegionBounds,
    filters: BathroomFilters
  ): Promise<{ items: BathroomListItem[]; cached_at: string } | null> {
    const index = await this.readIndexRecords();
    const relevantIndexEntries = index.filter((entry) => doesPackIntersectRegion(entry.manifest, region));

    if (!relevantIndexEntries.length) {
      return null;
    }

    const relevantPacks = await this.readPacksForIndexEntries(relevantIndexEntries);

    const rows = relevantPacks.flatMap((pack) =>
      pack.bathrooms
        .filter((bathroom) => isBathroomInsideRegion(bathroom, region))
        .map((bathroom) => ({
          bathroom,
          downloaded_at: pack.downloaded_at,
        }))
    );

    const filteredRows = rows.filter(({ bathroom }) => applyBathroomFilters([bathroom], filters).length > 0);

    if (!filteredRows.length) {
      return null;
    }

    const items = filteredRows
      .map(({ bathroom, downloaded_at }) =>
        mapBathroomRowToListItem(bathroom, {
          cachedAt: downloaded_at,
          stale: false,
          origin: {
            latitude: region.latitude,
            longitude: region.longitude,
          },
        })
      )
      .sort((leftBathroom, rightBathroom) => {
        if (filters.prioritizeAccessible && rightBathroom.accessibility_score !== leftBathroom.accessibility_score) {
          return rightBathroom.accessibility_score - leftBathroom.accessibility_score;
        }

        return (leftBathroom.distance_meters ?? 0) - (rightBathroom.distance_meters ?? 0);
      });

    const cachedAt = filteredRows
      .map((row) => row.downloaded_at)
      .sort((leftDate, rightDate) => rightDate.localeCompare(leftDate))[0];

    return {
      items,
      cached_at: cachedAt,
    };
  }

  async searchBathrooms(input: {
    query: string;
    filters: BathroomFilters;
    origin?: { latitude: number; longitude: number } | null;
    limit?: number;
  }): Promise<{ items: BathroomListItem[]; cached_at: string } | null> {
    const index = await this.readIndexRecords();
    const candidateIndexEntries = index.filter((entry) => doesPackIndexMatchQuery(entry, input.query));

    if (!candidateIndexEntries.length) {
      return null;
    }

    const packs = await this.readPacksForIndexEntries(candidateIndexEntries);

    const matches = packs.flatMap((pack) =>
      pack.bathrooms
        .map((bathroom) => ({
          bathroom,
          downloaded_at: pack.downloaded_at,
          score: scoreBathroomAgainstQuery(bathroom, input.query),
        }))
        .filter(({ bathroom, score }) => {
          if (input.query.trim().length >= 2 && score <= 0) {
            return false;
          }

          return applyBathroomFilters([bathroom], input.filters).length > 0;
        })
    );

    if (!matches.length) {
      return null;
    }

    const dedupedMatchMap = matches.reduce<
      Map<string, { bathroom: CityPackBathroomRow; downloaded_at: string; score: number }>
    >((nextMap, match) => {
      const existingMatch = nextMap.get(match.bathroom.id);

      if (!existingMatch || match.score > existingMatch.score) {
        nextMap.set(match.bathroom.id, match);
      }

      return nextMap;
    }, new Map());
    const dedupedMatches = Array.from(dedupedMatchMap.values());

    const sortableItems = dedupedMatches
      .map((match) => ({
        item:
          mapBathroomRowToListItem(match.bathroom, {
            cachedAt: match.downloaded_at,
            stale: false,
            origin: input.origin ?? null,
          }),
        score: match.score,
      }))
      .sort((leftEntry, rightEntry) => {
        const scoreDelta = rightEntry.score - leftEntry.score;

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        const leftBathroom = leftEntry.item;
        const rightBathroom = rightEntry.item;

        if (
          input.filters.prioritizeAccessible &&
          rightBathroom.accessibility_score !== leftBathroom.accessibility_score
        ) {
          return rightBathroom.accessibility_score - leftBathroom.accessibility_score;
        }

        if (input.origin) {
          const leftDistance = leftBathroom.distance_meters ?? calculateDistanceMeters(input.origin, leftBathroom.coordinates);
          const rightDistance = rightBathroom.distance_meters ?? calculateDistanceMeters(input.origin, rightBathroom.coordinates);
          return leftDistance - rightDistance;
        }

        return leftBathroom.place_name.localeCompare(rightBathroom.place_name);
      });

    const items = sortableItems
      .map((entry) => entry.item)
      .slice(0, input.limit ?? 40);

    const cachedAt = dedupedMatches
      .map((match) => match.downloaded_at)
      .sort((leftDate, rightDate) => rightDate.localeCompare(leftDate))[0];

    return {
      items,
      cached_at: cachedAt,
    };
  }
}

export const premiumCityPackStorage = new PremiumCityPackStorage();
