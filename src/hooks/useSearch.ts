import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchBathrooms } from '@/api/bathrooms';
import { BathroomListItem, BathroomQueryResult, BathroomFilters, Coordinates } from '@/types';
import { cacheManager } from '@/lib/cache-manager';
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
    queryFn: async () => {
      const cachedBathrooms = await cacheManager.getWithMeta<BathroomListItem[]>(cacheKey);

      try {
        const result = await searchBathrooms({
          query: debouncedQuery,
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
