import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCityBrowse, searchBathrooms } from '@/api/bathrooms';
import { cacheManager } from '@/lib/cache-manager';
import { premiumCityPackStorage } from '@/lib/premium-city-packs';
import { SearchQuerySchema } from '@/lib/validators';
import {
  BathroomFilters,
  BathroomListItem,
  BathroomQueryResult,
  CityBrowseItem,
  Coordinates,
} from '@/types';
import { buildSearchCacheKey, hasActiveBathroomFilters, mapBathroomRowToListItem } from '@/utils/bathroom';

interface UseSearchOptions {
  query: string;
  filters: BathroomFilters;
  origin?: Coordinates | null;
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

const CITY_BROWSE_LIMIT = 12;

export function useSearch({ query, filters, origin }: UseSearchOptions) {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [query]);

  const hasFilters = hasActiveBathroomFilters(filters);
  const isSearchReady = hasFilters || debouncedQuery.length >= 2;
  const cacheKey = useMemo(
    () => `search:${buildSearchCacheKey(debouncedQuery, filters, origin ?? null)}`,
    [debouncedQuery, filters, origin]
  );

  const queryResult = useQuery<BathroomQueryResult, Error>({
    queryKey: ['search', cacheKey],
    enabled: isSearchReady,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const cachedBathrooms = await cacheManager.getWithMeta<BathroomListItem[]>(cacheKey);
      const validatedQuery =
        debouncedQuery.length >= 2
          ? SearchQuerySchema.safeParse({
              query: debouncedQuery,
              limit: 40,
            })
          : null;

      try {
        const result = await searchBathrooms({
          query: validatedQuery?.success ? validatedQuery.data.query : debouncedQuery,
          filters,
          origin,
        });

        if (result.error) {
          throw result.error;
        }

        const cachedAt = new Date().toISOString();
        const items = result.data.map((bathroom) =>
          mapBathroomRowToListItem(bathroom, {
            cachedAt,
            stale: false,
            origin,
          })
        );

        await cacheManager.set(cacheKey, items);

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

        const downloadedCityPackResult = await premiumCityPackStorage.searchBathrooms({
          query: validatedQuery?.success ? validatedQuery.data.query : debouncedQuery,
          filters,
          origin,
        });

        if (downloadedCityPackResult) {
          return {
            items: downloadedCityPackResult.items,
            source: 'cache',
            cached_at: downloadedCityPackResult.cached_at,
            is_stale: false,
          };
        }

        throw error instanceof Error ? error : new Error('Unable to search bathrooms.');
      }
    },
  });

  return {
    ...queryResult,
    debouncedQuery,
    hasActiveFilters: hasFilters,
    isSearchReady,
  };
}

export function useCityBrowse(limit = CITY_BROWSE_LIMIT) {
  return useQuery<CityBrowseItem[], Error>({
    queryKey: ['search', 'city-browse', limit],
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const result = await fetchCityBrowse({
        limit,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
