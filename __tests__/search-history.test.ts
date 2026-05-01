import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const get: jest.MockedFunction<(key: string) => Promise<unknown>> = jest.fn();
const remove: jest.MockedFunction<(key: string) => Promise<void>> = jest.fn();
const set: jest.MockedFunction<(key: string, value: unknown) => Promise<void>> = jest.fn();

jest.mock('@/lib/storage', () => ({
  storage: {
    keys: {
      SEARCH_HISTORY: '@stallpass/search_history',
    },
    get,
    remove,
    set,
  },
}));

describe('search history storage', () => {
  beforeEach(() => {
    get.mockReset();
    remove.mockReset();
    set.mockReset();
  });

  it('loads sanitized search history from storage', async () => {
    get.mockResolvedValueOnce([
      {
        query: 'Seattle Center',
        searched_at: '2026-03-16T10:00:00.000Z',
        result_count: 4,
      },
      {
        query: '',
        searched_at: 'bad-date',
      },
    ]);

    const { loadSearchHistory } = await import('@/lib/search-history');
    const history = await loadSearchHistory();

    expect(history).toEqual([
      {
        query: 'Seattle Center',
        searched_at: '2026-03-16T10:00:00.000Z',
        result_count: 4,
      },
    ]);
  });

  it('remembers a query and persists the next history set', async () => {
    const { rememberSearchQuery } = await import('@/lib/search-history');
    const history = await rememberSearchQuery(
      [
        {
          query: 'Ferry Terminal',
          searched_at: '2026-03-16T09:00:00.000Z',
          result_count: 2,
        },
      ],
      'Pike Place',
      7
    );

    expect(history[0]?.query).toBe('Pike Place');
    expect(history[0]?.result_count).toBe(7);
    expect(set).toHaveBeenCalledWith('@stallpass/search_history', history);
  });

  it('forgets a query and persists the reduced history', async () => {
    const { forgetSearchQuery } = await import('@/lib/search-history');
    const history = await forgetSearchQuery(
      [
        {
          query: 'Ferry Terminal',
          searched_at: '2026-03-16T09:00:00.000Z',
          result_count: 2,
        },
        {
          query: 'Pike Place',
          searched_at: '2026-03-16T10:00:00.000Z',
          result_count: 7,
        },
      ],
      'Ferry Terminal'
    );

    expect(history).toEqual([
      {
        query: 'Pike Place',
        searched_at: '2026-03-16T10:00:00.000Z',
        result_count: 7,
      },
    ]);
    expect(set).toHaveBeenCalledWith('@stallpass/search_history', history);
  });

  it('clears stored search history', async () => {
    const { clearStoredSearchHistory } = await import('@/lib/search-history');
    await clearStoredSearchHistory();

    expect(remove).toHaveBeenCalledWith('@stallpass/search_history');
  });
});
