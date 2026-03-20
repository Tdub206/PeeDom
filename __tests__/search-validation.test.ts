import { describe, expect, it } from '@jest/globals';
import { SearchQuerySchema, SearchSuggestionQuerySchema } from '@/lib/validators';

describe('search query validation', () => {
  it('accepts trimmed search queries with default limits', () => {
    const parsedQuery = SearchQuerySchema.parse({
      query: '  Pike Place  ',
    });

    expect(parsedQuery).toEqual({
      query: 'Pike Place',
      limit: 25,
      offset: 0,
      radiusMeters: 8047,
      hasCode: null,
    });
  });

  it('rejects queries shorter than two characters', () => {
    expect(() =>
      SearchQuerySchema.parse({
        query: 'a',
      })
    ).toThrow();
  });

  it('accepts valid suggestion queries and rejects one-character input', () => {
    expect(
      SearchSuggestionQuerySchema.parse({
        query: '  Pike  ',
      })
    ).toEqual({
      query: 'Pike',
    });

    expect(() =>
      SearchSuggestionQuerySchema.parse({
        query: 'x',
      })
    ).toThrow();
  });
});
