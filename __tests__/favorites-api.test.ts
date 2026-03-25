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

const userId = '550e8400-e29b-41d4-a716-446655440001';
const bathroomId = '550e8400-e29b-41d4-a716-446655440002';

const favoriteBathroomRow = {
  id: bathroomId,
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
  accessibility_features: {
    has_grab_bars: false,
    door_width_inches: null,
    is_automatic_door: false,
    has_changing_table: false,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
    has_braille_signage: false,
    has_wheelchair_ramp: false,
    has_elevator_access: false,
    stall_width_inches: null,
    turning_radius_inches: null,
    notes: null,
    photo_urls: [],
    verification_date: null,
  },
  accessibility_score: 0,
  hours_json: null,
  code_id: '550e8400-e29b-41d4-a716-446655440003',
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

  it('loads favorite bathrooms through the get_favorites_with_detail RPC when available', async () => {
    rpc.mockResolvedValueOnce({
      data: [favoriteBathroomRow],
      error: null,
    });

    const { fetchFavoriteBathrooms } = await import('@/api/favorites');
    const result = await fetchFavoriteBathrooms({
      userId,
      origin: {
        latitude: 47.61,
        longitude: -122.33,
      },
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_favorites_with_detail', {
      p_user_id: userId,
      p_latitude: 47.61,
      p_longitude: -122.33,
      p_sort_by: 'date_added',
      p_limit: 100,
      p_offset: 0,
    });
    expect(result.data[0]?.bathroom_id).toBe(bathroomId);
    expect(result.data[0]?.distance_meters).toBe(220);
  });

  it('falls back to the legacy get_user_favorites RPC when the new RPC is missing', async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.get_favorites_with_detail',
        },
      })
      .mockResolvedValueOnce({
        data: [favoriteBathroomRow],
        error: null,
      });

    const { fetchFavoriteBathroomsPage } = await import('@/api/favorites');
    const result = await fetchFavoriteBathroomsPage({
      userId,
      sortBy: 'name',
      limit: 50,
      offset: 0,
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_user_favorites', {
      p_user_lat: null,
      p_user_lng: null,
    });
    expect(result.data[0]?.bathroom_id).toBe(bathroomId);
  });

  it('falls back to the favorites table and bathroom lookup when both RPCs are unavailable', async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.get_favorites_with_detail',
        },
      })
      .mockResolvedValueOnce({
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
            id: '550e8400-e29b-41d4-a716-446655440010',
            user_id: userId,
            bathroom_id: bathroomId,
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
      userId,
    });

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith('favorites');
    expect(fetchBathroomsByIds).toHaveBeenCalledWith({
      bathroomIds: [bathroomId],
      origin: undefined,
    });
    expect(result.data[0]?.bathroom_id).toBe(bathroomId);
  });

  it('hydrates visible favorite ids through the batch RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ bathroom_id: bathroomId }],
      error: null,
    });

    const { fetchFavoriteIds } = await import('@/api/favorites');
    const result = await fetchFavoriteIds({
      userId,
      bathroomIds: [bathroomId],
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual([bathroomId]);
  });

  it('toggles favorites atomically through the toggle_favorite RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        action: 'added',
        bathroom_id: bathroomId,
        user_id: userId,
        toggled_at: '2026-03-19T00:00:00.000Z',
      },
      error: null,
    });

    const { toggleFavorite } = await import('@/api/favorites');
    const result = await toggleFavorite(userId, bathroomId);

    expect(result.error).toBeNull();
    expect(result.data?.action).toBe('added');
    expect(rpc).toHaveBeenCalledWith('toggle_favorite', {
      p_bathroom_id: bathroomId,
    });
  });
});
