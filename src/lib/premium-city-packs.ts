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

const isoTimestampSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO-compatible timestamp.');

const downloadedCityPackSchema = z.object({
  manifest: premiumCityPackManifestSchema,
  downloaded_at: isoTimestampSchema,
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
  private async readIndex(): Promise<DownloadedPremiumCityPack[]> {
    const storedIndex = await storage.get<unknown>(storage.keys.PREMIUM_CITY_PACK_INDEX);
    const parsedIndex = downloadedCityPackListSchema.safeParse(storedIndex ?? []);

    if (!parsedIndex.success) {
      await storage.remove(storage.keys.PREMIUM_CITY_PACK_INDEX).catch(() => undefined);
      return [];
    }

    return parsedIndex.data.map((entry) => ({
      ...entry.manifest,
      downloaded_at: entry.downloaded_at,
    }));
  }

  private async writeIndex(packs: DownloadedPremiumCityPack[]): Promise<void> {
    await storage.set(
      storage.keys.PREMIUM_CITY_PACK_INDEX,
      packs.map((pack) => ({
        manifest: {
          slug: pack.slug,
          city: pack.city,
          state: pack.state,
          country_code: pack.country_code,
          bathroom_count: pack.bathroom_count,
          center_latitude: pack.center_latitude,
          center_longitude: pack.center_longitude,
          min_latitude: pack.min_latitude,
          max_latitude: pack.max_latitude,
          min_longitude: pack.min_longitude,
          max_longitude: pack.max_longitude,
          latest_bathroom_update_at: pack.latest_bathroom_update_at,
          latest_code_verified_at: pack.latest_code_verified_at,
        },
        downloaded_at: pack.downloaded_at,
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

  private async readAllPacks(): Promise<StoredPremiumCityPackRecord[]> {
    const index = await this.readIndex();
    const packs = await Promise.all(index.map((pack) => this.readPack(pack.slug)));

    return packs.filter((pack): pack is StoredPremiumCityPackRecord => Boolean(pack));
  }

  async listDownloadedPacks(): Promise<DownloadedPremiumCityPack[]> {
    return this.readIndex();
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

    const existingIndex = await this.readIndex();
    const nextIndex = [
      ...existingIndex.filter((pack) => pack.slug !== manifest.slug),
      {
        ...manifest,
        downloaded_at: downloadedAt,
      },
    ].sort((leftPack, rightPack) => rightPack.downloaded_at.localeCompare(leftPack.downloaded_at));

    await this.writeIndex(nextIndex);
  }

  async removePack(slug: string): Promise<void> {
    await storage.remove(getCityPackStorageKey(slug));
    const existingIndex = await this.readIndex();
    await this.writeIndex(existingIndex.filter((pack) => pack.slug !== slug));
  }

  async findBathroomsInRegion(
    region: RegionBounds,
    filters: BathroomFilters
  ): Promise<{ items: BathroomListItem[]; cached_at: string } | null> {
    const packs = await this.readAllPacks();
    const relevantPacks = packs.filter((pack) => doesPackIntersectRegion(pack.manifest, region));

    if (!relevantPacks.length) {
      return null;
    }

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
      .sort((leftBathroom, rightBathroom) => (leftBathroom.distance_meters ?? 0) - (rightBathroom.distance_meters ?? 0));

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
    const packs = await this.readAllPacks();

    if (!packs.length) {
      return null;
    }

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

    const dedupedMatches = Array.from(
      matches.reduce<Map<string, { bathroom: CityPackBathroomRow; downloaded_at: string; score: number }>>((nextMap, match) => {
        const existingMatch = nextMap.get(match.bathroom.id);

        if (!existingMatch || match.score > existingMatch.score) {
          nextMap.set(match.bathroom.id, match);
        }

        return nextMap;
      }, new Map())
    ).map(([, match]) => match);

    const items = dedupedMatches
      .map((match) =>
        mapBathroomRowToListItem(match.bathroom, {
          cachedAt: match.downloaded_at,
          stale: false,
          origin: input.origin ?? null,
        })
      )
      .sort((leftBathroom, rightBathroom) => {
        const leftMatch = dedupedMatches.find((match) => match.bathroom.id === leftBathroom.id);
        const rightMatch = dedupedMatches.find((match) => match.bathroom.id === rightBathroom.id);
        const scoreDelta = (rightMatch?.score ?? 0) - (leftMatch?.score ?? 0);

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        if (input.origin) {
          const leftDistance = leftBathroom.distance_meters ?? calculateDistanceMeters(input.origin, leftBathroom.coordinates);
          const rightDistance = rightBathroom.distance_meters ?? calculateDistanceMeters(input.origin, rightBathroom.coordinates);
          return leftDistance - rightDistance;
        }

        return leftBathroom.place_name.localeCompare(rightBathroom.place_name);
      })
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
