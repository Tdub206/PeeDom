import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchCityBrowse, fetchSearchSuggestions, searchBathrooms } from '@/api/bathrooms';
import { cacheManager } from '@/lib/cache-manager';
import { premiumCityPackStorage } from '@/lib/premium-city-packs';
import { SearchQuerySchema, SearchSuggestionQuerySchema } from '@/lib/validators';
import {
  BathroomFilters,
  BathroomListItem,
  BathroomQueryResult,
  CityBrowseItem,
  Coordinates,
  DEFAULT_SEARCH_DISCOVERY_FILTERS,
  SearchSuggestion,
} from '@/types';
import { useSearchStore } from '@/store/useSearchStore';
import { buildSearchCacheKey, hasActiveBathroomFilters, mapBathroomRowToListItem } from '@/utils/bathroom';

interface UseSearchOptions {
  filters: BathroomFilters;
  origin?: Coordinates | null;
  onSearchResolved?: (query: string, resultCount: number) => Promise<void> | void;
}

interface SearchPage extends BathroomQueryResult {
  offset: number;
  has_more: boolean;
}

const SEARCH_PAGE_SIZE = 25;

function markItemsAsStale(items: BathroomListItem[]): BathroomListItem[] {
  return items.map((item) => ({
    ...item,
    sync: {
      ...item.sync,
      stale: true,
    },
  }));
}

function applyOfflineDiscoveryFilters(
  items: BathroomListItem[],
  hasCode: boolean | null,
  radiusMeters: number,
  origin?: Coordinates | null
): BathroomListItem[] {
  return items.filter((item) => {
    if (hasCode === true && !item.primary_code_summary.has_code) {
      return false;
    }

    if (hasCode === false && item.primary_code_summary.has_code) {
      return false;
    }

    if (!origin) {
      return true;
    }

    return typeof item.distance_meters !== 'number' || item.distance_meters <= radiusMeters;
  });
}

const CITY_BROWSE_LIMIT = 12;

export function useSearch({ filters, origin, onSearchResolved }: UseSearchOptions) {
  const committedQuery = useSearchStore((state) => state.committedQuery);
  const hasCode = useSearchStore((state) => state.discoveryFilters.hasCode);
  const radiusMeters = useSearchStore((state) => state.discoveryFilters.radiusMeters);
  const hasDiscoveryFilters =
    typeof hasCode === 'boolean' ||
    radiusMeters !== DEFAULT_SEARCH_DISCOVERY_FILTERS.radiusMeters;
  const isSearchReady =
    committedQuery.trim().length >= 2 ||
    (Boolean(origin) && (hasActiveBathroomFilters(filters) || hasDiscoveryFilters));
  const cacheKeyBase = useMemo(
    () =>
      `search:${buildSearchCacheKey(committedQuery, filters, origin ?? null)}:code:${
        hasCode === null ? 'any' : hasCode ? 'yes' : 'no'
      }:radius:${radiusMeters}`,
    [committedQuery, filters, hasCode, origin, radiusMeters]
  );
  const lastRecordedSearchRef = useRef<string | null>(null);

  const queryResult = useInfiniteQuery<SearchPage, Error>({
    queryKey: ['search', cacheKeyBase],
    enabled: isSearchReady,
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      const pageCacheKey = `${cacheKeyBase}:page:${offset}`;
      const cachedBathrooms = offset === 0 ? await cacheManager.getWithMeta<BathroomListItem[]>(pageCacheKey) : null;
      const validatedQuery =
        committedQuery.trim().length >= 2
          ? SearchQuerySchema.safeParse({
              query: committedQuery,
              limit: SEARCH_PAGE_SIZE,
              offset,
              radiusMeters,
              hasCode,
            })
          : null;

      try {
        const result = await searchBathrooms({
          query: validatedQuery?.success ? validatedQuery.data.query : committedQuery,
          filters,
          origin,
          hasCode,
          radiusMeters,
          limit: SEARCH_PAGE_SIZE,
          offset,
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

        await cacheManager.set(pageCacheKey, items);

        return {
          items,
          source: 'network',
          cached_at: cachedAt,
          is_stale: false,
          offset,
          has_more: result.data.length === SEARCH_PAGE_SIZE,
        };
      } catch (error) {
        if (cachedBathrooms) {
          return {
            items: markItemsAsStale(cachedBathrooms.data),
            source: 'cache',
            cached_at: cachedBathrooms.cached_at,
            is_stale: true,
            offset,
            has_more: false,
          };
        }

        if (offset === 0) {
          const downloadedCityPackResult = await premiumCityPackStorage.searchBathrooms({
            query: validatedQuery?.success ? validatedQuery.data.query : committedQuery,
            filters,
            origin,
            limit: SEARCH_PAGE_SIZE,
          });

          if (downloadedCityPackResult) {
            const filteredItems = applyOfflineDiscoveryFilters(
              downloadedCityPackResult.items,
              hasCode,
              radiusMeters,
              origin
            );

            return {
              items: filteredItems,
              source: 'cache',
              cached_at: downloadedCityPackResult.cached_at,
              is_stale: false,
              offset,
              has_more: false,
            };
          }
        }

        throw error instanceof Error ? error : new Error('Unable to search bathrooms.');
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + SEARCH_PAGE_SIZE : undefined,
  });

  useEffect(() => {
    if (!onSearchResolved || committedQuery.trim().length < 2 || queryResult.status !== 'success') {
      return;
    }

    const historyKey = `${committedQuery.trim().toLowerCase()}:${queryResult.dataUpdatedAt}`;

    if (lastRecordedSearchRef.current === historyKey) {
      return;
    }

    lastRecordedSearchRef.current = historyKey;
    const firstPageCount = queryResult.data.pages[0]?.items.length ?? 0;

    void Promise.resolve(onSearchResolved(committedQuery.trim(), firstPageCount)).catch(() => undefined);
  }, [committedQuery, onSearchResolved, queryResult.data, queryResult.dataUpdatedAt, queryResult.status]);

  return {
    ...queryResult,
    items: queryResult.data?.pages.flatMap((page) => page.items) ?? [],
    hasActiveFilters: hasActiveBathroomFilters(filters) || hasDiscoveryFilters,
    isSearchReady,
  };
}

export function useSearchSuggestions(origin?: Coordinates | null) {
  const activeQuery = useSearchStore((state) => state.activeQuery);
  const committedQuery = useSearchStore((state) => state.committedQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(activeQuery.trim());

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedQuery(activeQuery.trim());
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [activeQuery]);

  return useQuery<SearchSuggestion[], Error>({
    queryKey: ['search', 'suggestions', debouncedQuery, origin?.latitude ?? null, origin?.longitude ?? null],
    enabled: debouncedQuery.length >= 2 && debouncedQuery !== committedQuery.trim(),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const parsedQuery = SearchSuggestionQuerySchema.safeParse({
        query: debouncedQuery,
      });

      if (!parsedQuery.success) {
        return [];
      }

      const result = await fetchSearchSuggestions({
        query: parsedQuery.data.query,
        origin,
        limit: 8,
      });

      if (result.error) {
        return [];
      }

      return result.data.map((suggestion) => ({
        bathroom_id: suggestion.bathroom_id,
        place_name: suggestion.place_name,
        city: suggestion.city,
        state: suggestion.state,
        distance_meters: suggestion.distance_meters,
      }));
    },
  });
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
