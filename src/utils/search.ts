import { CityBrowseItem, SearchHistoryItem } from '@/types';

export const SEARCH_HISTORY_LIMIT = 20;

export function formatSearchDistance(distanceMeters: number | null | undefined): string | null {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return null;
  }

  if (distanceMeters < 160) {
    return `${Math.max(1, Math.round(distanceMeters))} m away`;
  }

  const distanceMiles = distanceMeters / 1609.34;

  if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)} mi away`;
  }

  return `${Math.round(distanceMiles)} mi away`;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

export function upsertSearchHistory(
  history: SearchHistoryItem[],
  query: string,
  searchedAt = new Date().toISOString(),
  resultCount: number | null = null
): SearchHistoryItem[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < 2) {
    return history;
  }

  const deduplicatedHistory = history.filter(
    (historyItem) => historyItem.query.toLowerCase() !== normalizedQuery.toLowerCase()
  );

  return [
    {
      query: normalizedQuery,
      searched_at: searchedAt,
      result_count: resultCount,
    },
    ...deduplicatedHistory,
  ].slice(0, SEARCH_HISTORY_LIMIT);
}

export function removeSearchHistoryEntry(history: SearchHistoryItem[], query: string): SearchHistoryItem[] {
  return history.filter((historyItem) => historyItem.query !== query);
}

export function sanitizeSearchHistory(value: unknown): SearchHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (historyItem): historyItem is SearchHistoryItem =>
        typeof historyItem === 'object' &&
        historyItem !== null &&
        typeof (historyItem as SearchHistoryItem).query === 'string' &&
        (historyItem as SearchHistoryItem).query.trim().length >= 2 &&
        typeof (historyItem as SearchHistoryItem).searched_at === 'string' &&
        !Number.isNaN(Date.parse((historyItem as SearchHistoryItem).searched_at)) &&
        (typeof (historyItem as SearchHistoryItem).result_count === 'number' ||
          typeof (historyItem as SearchHistoryItem).result_count === 'undefined' ||
          (historyItem as SearchHistoryItem).result_count === null)
    )
    .slice(0, SEARCH_HISTORY_LIMIT);
}

interface CityBrowseSourceRow {
  city: string | null;
  state: string | null;
}

export function groupCityBrowseRows<T extends CityBrowseSourceRow>(
  rows: T[],
  limit: number
): CityBrowseItem[] {
  const cityMap = new Map<string, CityBrowseItem>();

  rows.forEach((row) => {
    if (!row.city || !row.state) {
      return;
    }

    const normalizedCity = row.city.trim();
    const normalizedState = row.state.trim();
    const key = `${normalizedCity.toLowerCase()}::${normalizedState.toLowerCase()}`;
    const existingCity = cityMap.get(key);

    if (existingCity) {
      existingCity.bathroom_count += 1;
      return;
    }

    cityMap.set(key, {
      city: normalizedCity,
      state: normalizedState,
      bathroom_count: 1,
    });
  });

  return [...cityMap.values()]
    .sort((leftCity, rightCity) => {
      if (rightCity.bathroom_count !== leftCity.bathroom_count) {
        return rightCity.bathroom_count - leftCity.bathroom_count;
      }

      const cityComparison = leftCity.city.localeCompare(rightCity.city);

      if (cityComparison !== 0) {
        return cityComparison;
      }

      return leftCity.state.localeCompare(rightCity.state);
    })
    .slice(0, Math.max(1, limit));
}
