import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const maybeSingle: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const select: jest.MockedFunction<() => unknown> = jest.fn();
const eq: jest.MockedFunction<(column: string, value: unknown) => unknown> = jest.fn();
const upsert: jest.MockedFunction<(values: unknown, options?: unknown) => unknown> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
  }),
}));

describe('cleanliness ratings API', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    select.mockReset();
    eq.mockReset();
    upsert.mockReset();
    from.mockReset();
  });

  it('loads the current user cleanliness rating for a bathroom', async () => {
    eq.mockReturnThis();
    select.mockReturnThis();
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'rating-1',
        bathroom_id: 'bathroom-1',
        user_id: 'user-1',
        rating: 4,
        notes: 'Pretty clean.',
        created_at: '2026-03-19T10:00:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      select,
      eq,
      maybeSingle,
    });

    const { fetchUserCleanlinessRating } = await import('@/api/cleanliness-ratings');
    const result = await fetchUserCleanlinessRating('user-1', 'bathroom-1');

    expect(result.error).toBeNull();
    expect(result.data?.rating).toBe(4);
    expect(from).toHaveBeenCalledWith('cleanliness_ratings');
  });

  it('upserts a cleanliness rating with the bathroom/user unique key', async () => {
    select.mockReturnThis();
    upsert.mockReturnValueOnce({
      select,
      maybeSingle,
    });
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'rating-2',
        bathroom_id: 'bathroom-2',
        user_id: 'user-2',
        rating: 5,
        notes: null,
        created_at: '2026-03-19T11:00:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      upsert,
    });

    const { upsertCleanlinessRating } = await import('@/api/cleanliness-ratings');
    const result = await upsertCleanlinessRating('user-2', {
      bathroom_id: 'bathroom-2',
      rating: 5,
    });

    expect(result.error).toBeNull();
    expect(result.data?.rating).toBe(5);
    expect(upsert).toHaveBeenCalledWith(
      {
        bathroom_id: 'bathroom-2',
        user_id: 'user-2',
        rating: 5,
        notes: null,
      },
      {
        onConflict: 'bathroom_id,user_id',
      }
    );
  });
});
