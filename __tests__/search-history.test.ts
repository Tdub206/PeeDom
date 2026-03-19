import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const get: jest.MockedFunction<(key: string) => Promise<unknown>> = jest.fn();
const remove: jest.MockedFunction<(key: string) => Promise<void>> = jest.fn();
const set: jest.MockedFunction<(key: string, value: unknown) => Promise<void>> = jest.fn();

jest.mock('@/lib/storage', () => ({
  storage: {
    keys: {
      SEARCH_HISTORY: '@peedom/search_history',
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
        },
      ],
      'Pike Place'
    );

    expect(history[0]?.query).toBe('Pike Place');
    expect(set).toHaveBeenCalledWith('@peedom/search_history', history);
  });

  it('forgets a query and persists the reduced history', async () => {
    const { forgetSearchQuery } = await import('@/lib/search-history');
    const history = await forgetSearchQuery(
      [
        {
          query: 'Ferry Terminal',
          searched_at: '2026-03-16T09:00:00.000Z',
        },
        {
          query: 'Pike Place',
          searched_at: '2026-03-16T10:00:00.000Z',
        },
      ],
      'Ferry Terminal'
    );

    expect(history).toEqual([
      {
        query: 'Pike Place',
        searched_at: '2026-03-16T10:00:00.000Z',
      },
    ]);
    expect(set).toHaveBeenCalledWith('@peedom/search_history', history);
  });

  it('clears stored search history', async () => {
    const { clearStoredSearchHistory } = await import('@/lib/search-history');
    await clearStoredSearchHistory();

    expect(remove).toHaveBeenCalledWith('@peedom/search_history');
  });
});
