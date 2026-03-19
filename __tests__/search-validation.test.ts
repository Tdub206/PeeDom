import { describe, expect, it } from '@jest/globals';
import { SearchQuerySchema } from '@/lib/validators';

describe('search query validation', () => {
  it('accepts trimmed search queries with default limits', () => {
    const parsedQuery = SearchQuerySchema.parse({
      query: '  Pike Place  ',
    });

    expect(parsedQuery).toEqual({
      query: 'Pike Place',
      limit: 40,
    });
  });

  it('rejects queries shorter than two characters', () => {
    expect(() =>
      SearchQuerySchema.parse({
        query: 'a',
      })
    ).toThrow();
  });
});
