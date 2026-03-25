import { describe, expect, it } from '@jest/globals';
import {
  formatSearchDistance,
  groupCityBrowseRows,
  normalizeSearchQuery,
  removeSearchHistoryEntry,
  sanitizeSearchHistory,
  upsertSearchHistory,
} from '@/utils/search';

describe('search utilities', () => {
  it('normalizes whitespace in search queries', () => {
    expect(normalizeSearchQuery('  pike   place  market ')).toBe('pike place market');
  });

  it('deduplicates history entries case-insensitively and keeps the latest first', () => {
    const nextHistory = upsertSearchHistory(
      [
        {
          query: 'Pike Place',
          searched_at: '2026-03-16T10:00:00.000Z',
        },
        {
          query: 'Central Library',
          searched_at: '2026-03-16T09:00:00.000Z',
        },
      ],
      'pike place',
      '2026-03-16T11:00:00.000Z'
    );

    expect(nextHistory).toHaveLength(2);
    expect(nextHistory[0]?.query).toBe('pike place');
    expect(nextHistory[0]?.searched_at).toBe('2026-03-16T11:00:00.000Z');
    expect(nextHistory[0]?.result_count).toBeNull();
  });

  it('ignores search history entries that are too short', () => {
    expect(upsertSearchHistory([], 'a')).toEqual([]);
  });

  it('removes a search history entry by exact query', () => {
    const nextHistory = removeSearchHistoryEntry(
      [
        {
          query: 'Pike Place',
          searched_at: '2026-03-16T10:00:00.000Z',
        },
        {
          query: 'Central Library',
          searched_at: '2026-03-16T09:00:00.000Z',
        },
      ],
      'Pike Place'
    );

    expect(nextHistory).toHaveLength(1);
    expect(nextHistory[0]?.query).toBe('Central Library');
  });

  it('sanitizes malformed stored history payloads', () => {
    const nextHistory = sanitizeSearchHistory([
      {
        query: 'Union Square',
        searched_at: '2026-03-16T10:00:00.000Z',
        result_count: 3,
      },
      {
        query: '',
        searched_at: 'invalid-date',
      },
      'bad-payload',
    ]);

    expect(nextHistory).toEqual([
      {
        query: 'Union Square',
        searched_at: '2026-03-16T10:00:00.000Z',
        result_count: 3,
      },
    ]);
  });

  it('formats short distances in meters and longer distances in miles', () => {
    expect(formatSearchDistance(120)).toBe('120 m away');
    expect(formatSearchDistance(483)).toBe('0.3 mi away');
    expect(formatSearchDistance(19312)).toBe('12 mi away');
    expect(formatSearchDistance(null)).toBeNull();
  });

  it('groups city browse rows and sorts by bathroom count', () => {
    const groupedCities = groupCityBrowseRows(
      [
        { city: 'Seattle', state: 'WA' },
        { city: 'Seattle', state: 'WA' },
        { city: 'Tacoma', state: 'WA' },
        { city: 'Portland', state: 'OR' },
        { city: null, state: 'CA' },
      ],
      3
    );

    expect(groupedCities).toEqual([
      {
        city: 'Seattle',
        state: 'WA',
        bathroom_count: 2,
      },
      {
        city: 'Portland',
        state: 'OR',
        bathroom_count: 1,
      },
      {
        city: 'Tacoma',
        state: 'WA',
        bathroom_count: 1,
      },
    ]);
  });
});
