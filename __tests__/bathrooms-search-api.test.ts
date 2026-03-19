import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

const defaultFilters = {
  isAccessible: null,
  isLocked: null,
  isCustomerOnly: null,
  openNow: null,
  noCodeRequired: null,
  recentlyVerifiedOnly: null,
  hasChangingTable: null,
  isFamilyRestroom: null,
  minCleanlinessRating: null,
} as const;

const publicBathroomRow = {
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
  accessibility_features: {
    has_grab_bars: false,
    door_width_inches: null,
    is_automatic_door: false,
    has_changing_table: false,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
  },
  hours_json: null,
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 10,
  down_votes: 1,
  last_verified_at: '2026-03-16T10:00:00.000Z',
  expires_at: null,
  cleanliness_avg: 4.2,
  updated_at: '2026-03-16T10:00:00.000Z',
};

describe('bathrooms search API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it('uses the search_bathrooms RPC when available', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          ...publicBathroomRow,
          distance_meters: 220,
          rank: 0.94,
        },
      ],
      error: null,
    });

    const { searchBathrooms } = await import('@/api/bathrooms');
    const result = await searchBathrooms({
      query: 'central',
      filters: defaultFilters,
      origin: {
        latitude: 47.61,
        longitude: -122.33,
      },
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('search_bathrooms', {
      p_query: 'central',
      p_user_lat: 47.61,
      p_user_lng: -122.33,
      p_limit: 40,
    });
    expect(result.data[0]?.id).toBe('bathroom-1');
  });

  it('falls back to ilike search when the RPC is missing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.search_bathrooms',
      },
    });

    const fallbackQuery = {
      data: [publicBathroomRow],
      error: null,
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    };

    from.mockReturnValueOnce(fallbackQuery);

    const { searchBathrooms } = await import('@/api/bathrooms');
    const result = await searchBathrooms({
      query: 'central',
      filters: defaultFilters,
    });

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith('v_bathroom_detail_public');
    expect(fallbackQuery.or).toHaveBeenCalled();
    expect(result.data[0]?.place_name).toBe('Central Station');
  });

  it('loads city browse entries through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          city: 'Seattle',
          state: 'WA',
          bathroom_count: 42,
        },
      ],
      error: null,
    });

    const { fetchCityBrowse } = await import('@/api/bathrooms');
    const result = await fetchCityBrowse({
      limit: 5,
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_city_browse', {
      p_limit: 5,
    });
    expect(result.data).toEqual([
      {
        city: 'Seattle',
        state: 'WA',
        bathroom_count: 42,
      },
    ]);
  });

  it('falls back to grouped city rows when the browse RPC is missing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.get_city_browse',
      },
    });

    const fallbackQuery = {
      data: [
        { city: 'Seattle', state: 'WA' },
        { city: 'Seattle', state: 'WA' },
        { city: 'Tacoma', state: 'WA' },
      ],
      error: null,
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    from.mockReturnValueOnce(fallbackQuery);

    const { fetchCityBrowse } = await import('@/api/bathrooms');
    const result = await fetchCityBrowse({
      limit: 2,
    });

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith('v_bathrooms_public');
    expect(result.data).toEqual([
      {
        city: 'Seattle',
        state: 'WA',
        bathroom_count: 2,
      },
      {
        city: 'Tacoma',
        state: 'WA',
        bathroom_count: 1,
      },
    ]);
  });
});
