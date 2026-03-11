import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomsNearRegion } from '@/api/bathrooms';
import { config } from '@/constants/config';
import { cacheManager } from '@/lib/cache-manager';
import { BathroomListItem, BathroomQueryResult, RegionBounds, BathroomFilters } from '@/types';
import { buildBathroomsCacheKey, mapBathroomRowToListItem } from '@/utils/bathroom';

interface UseBathroomsOptions {
  region: RegionBounds;
  filters: BathroomFilters;
  enabled?: boolean;
}

function markItemsAsStale(items: BathroomListItem[]): BathroomListItem[] {
  return items.map((item) => ({
    ...item,
    sync: {
      ...item.sync,
      stale: true,
    },
  }));
}

export function useBathrooms({ region, filters, enabled = true }: UseBathroomsOptions) {
  const cacheKey = useMemo(() => `bathrooms:${buildBathroomsCacheKey(region, filters)}`, [filters, region]);

  return useQuery<BathroomQueryResult, Error>({
    queryKey: ['bathrooms', cacheKey],
    enabled,
    queryFn: async () => {
      const cachedBathrooms = await cacheManager.getWithMeta<BathroomListItem[]>(cacheKey);

      try {
        const result = await fetchBathroomsNearRegion({
          region,
          filters,
        });

        if (result.error) {
          throw result.error;
        }

        const cachedAt = new Date().toISOString();
        const items = result.data.map((bathroom) =>
          mapBathroomRowToListItem(bathroom, {
            cachedAt,
            stale: false,
            origin: {
              latitude: region.latitude,
              longitude: region.longitude,
            },
          })
        );

        await cacheManager.set(cacheKey, items, config.query.staleTime);

        return {
          items,
          source: 'network',
          cached_at: cachedAt,
          is_stale: false,
        };
      } catch (error) {
        if (cachedBathrooms) {
          return {
            items: markItemsAsStale(cachedBathrooms.data),
            source: 'cache',
            cached_at: cachedBathrooms.cached_at,
            is_stale: true,
          };
        }

        throw error instanceof Error ? error : new Error('Unable to load nearby bathrooms.');
      }
    },
  });
}
