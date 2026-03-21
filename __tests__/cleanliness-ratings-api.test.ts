import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const maybeSingle: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const select: jest.MockedFunction<() => unknown> = jest.fn();
const eq: jest.MockedFunction<(column: string, value: unknown) => unknown> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

describe('cleanliness ratings API', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    select.mockReset();
    eq.mockReset();
    from.mockReset();
    rpc.mockReset();
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

  it('upserts a cleanliness rating through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        bathroom_id: 'bathroom-2',
        rating: 5,
        rated_at: '2026-03-19T11:00:00.000Z',
      },
      error: null,
    });

    const { upsertCleanlinessRating } = await import('@/api/cleanliness-ratings');
    const result = await upsertCleanlinessRating('user-2', {
      bathroom_id: 'bathroom-2',
      rating: 5,
    });

    expect(result.error).toBeNull();
    expect(result.data?.rating).toBe(5);
    expect(rpc).toHaveBeenCalledWith('upsert_cleanliness_rating', {
      p_bathroom_id: 'bathroom-2',
      p_rating: 5,
      p_notes: null,
    });
  });

  it('maps validation errors from the RPC into stable app codes', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'INVALID_CLEANLINESS_RATING',
      },
    });

    const { upsertCleanlinessRating } = await import('@/api/cleanliness-ratings');
    const result = await upsertCleanlinessRating('user-2', {
      bathroom_id: 'bathroom-2',
      rating: 7,
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('INVALID_CLEANLINESS_RATING');
  });
});
