import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const fetchBathroomsByIds: jest.MockedFunction<
  (options: unknown) => Promise<{ data: unknown[]; error: unknown }>
> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

jest.mock('@/api/bathrooms', () => ({
  fetchBathroomsByIds,
}));

const favoriteBathroomRow = {
  id: 'bathroom-1',
  place_name: 'Central Station',
  address_line1: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  postal_code: '98101',
  country_code: 'US',
  latitude: 47.61,
  longitude: -122.33,
  is_locked: false,
  is_accessible: true,
  is_customer_only: false,
  hours_json: null,
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 10,
  down_votes: 1,
  last_verified_at: '2026-03-16T10:00:00.000Z',
  expires_at: null,
  cleanliness_avg: 4.2,
  updated_at: '2026-03-16T10:00:00.000Z',
  distance_meters: 220,
  favorited_at: '2026-03-17T10:00:00.000Z',
};

describe('favorites API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
    fetchBathroomsByIds.mockReset();
  });

  it('loads favorite bathrooms through the get_user_favorites RPC when available', async () => {
    rpc.mockResolvedValueOnce({
      data: [favoriteBathroomRow],
      error: null,
    });

    const { fetchFavoriteBathrooms } = await import('@/api/favorites');
    const result = await fetchFavoriteBathrooms({
      userId: 'user-1',
      origin: {
        latitude: 47.61,
        longitude: -122.33,
      },
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_user_favorites', {
      p_user_lat: 47.61,
      p_user_lng: -122.33,
    });
    expect(result.data[0]?.bathroom_id).toBe('bathroom-1');
    expect(result.data[0]?.distance_meters).toBe(220);
  });

  it('falls back to the favorites table and bathrooms lookup when the RPC is missing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.get_user_favorites',
      },
    });

    const favoritesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValueOnce({
        data: [
          {
            id: 'favorite-1',
            user_id: 'user-1',
            bathroom_id: 'bathroom-1',
            created_at: '2026-03-17T10:00:00.000Z',
          },
        ],
        error: null,
      }),
    };

    from.mockReturnValueOnce(favoritesQuery);
    fetchBathroomsByIds.mockResolvedValueOnce({
      data: [favoriteBathroomRow],
      error: null,
    });

    const { fetchFavoriteBathrooms } = await import('@/api/favorites');
    const result = await fetchFavoriteBathrooms({
      userId: 'user-1',
    });

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith('favorites');
    expect(fetchBathroomsByIds).toHaveBeenCalledWith({
      bathroomIds: ['bathroom-1'],
      origin: undefined,
    });
    expect(result.data[0]?.bathroom_id).toBe('bathroom-1');
  });
});
