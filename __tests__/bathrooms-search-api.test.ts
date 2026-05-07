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
  requireGrabBars: null,
  requireAutomaticDoor: null,
  requireGenderNeutral: null,
  minDoorWidth: null,
  minStallWidth: null,
  prioritizeAccessible: null,
  hideNonAccessible: null,
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
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 10,
  down_votes: 1,
  last_verified_at: '2026-03-16T10:00:00.000Z',
  expires_at: null,
  cleanliness_avg: 4.2,
  updated_at: '2026-03-16T10:00:00.000Z',
};

const directoryListingRow = {
  listing_kind: 'canonical',
  bathroom_id: 'bathroom-1',
  source_record_id: null,
  ...publicBathroomRow,
  verification_badge_type: null,
  stallpass_access_tier: 'public',
  show_on_free_map: true,
  is_business_location_verified: false,
  location_verified_at: null,
  active_offer_count: 0,
  location_archetype: 'general',
  archetype_metadata: {},
  code_policy: 'community',
  allow_user_code_submissions: true,
  has_official_code: false,
  owner_code_last_verified_at: null,
  official_access_instructions: null,
  origin_source_key: null,
  origin_label: null,
  origin_attribution_short: null,
  source_dataset: null,
  source_license_key: null,
  source_url: null,
  source_updated_at: null,
  source_last_verified_at: null,
  source_confirmation_count: 0,
  source_denial_count: 0,
  source_weighted_confirmation_score: 0,
  source_weighted_denial_score: 0,
  source_freshness_status: null,
  source_needs_review: false,
  can_favorite: true,
  can_submit_code: true,
  can_report_live_status: true,
  can_claim_business: true,
  distance_meters: 220,
  rank: 94,
} as const;

describe('bathrooms search API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it('uses the mixed directory search RPC when available', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          ...directoryListingRow,
          listing_kind: 'source_candidate',
          bathroom_id: null,
          source_record_id: 'source-1',
          code_id: null,
          confidence_score: null,
          up_votes: null,
          down_votes: null,
          last_verified_at: null,
          cleanliness_avg: null,
          verification_badge_type: null,
          is_business_location_verified: false,
          active_offer_count: 0,
          allow_user_code_submissions: false,
          has_official_code: false,
          can_favorite: false,
          can_submit_code: false,
          can_report_live_status: false,
          can_claim_business: false,
          origin_source_key: 'osm-overpass-us',
          origin_label: 'OpenStreetMap import',
          origin_attribution_short: 'OpenStreetMap contributors',
          source_dataset: 'OpenStreetMap Overpass public restrooms',
          source_license_key: 'ODbL-1.0',
          source_freshness_status: 'unreviewed',
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
    expect(rpc).toHaveBeenCalledWith('search_directory_listings', {
      p_query: 'central',
      p_user_lat: 47.61,
      p_user_lng: -122.33,
      p_radius_meters: 8047,
      p_is_accessible: null,
      p_is_locked: null,
      p_has_code: null,
      p_is_customer_only: null,
      p_limit: 25,
      p_offset: 0,
    });
    expect(result.data[0]?.listing_kind).toBe('source_candidate');
    expect(result.data[0]?.source_record_id).toBe('source-1');
  });

  it('falls back to the legacy canonical search RPC when the mixed RPC is missing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.search_directory_listings',
      },
    });
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
    expect(rpc).toHaveBeenNthCalledWith(2, 'search_bathrooms', {
      p_query: 'central',
      p_user_lat: 47.61,
      p_user_lng: -122.33,
      p_radius_meters: 8047,
      p_is_accessible: null,
      p_is_locked: null,
      p_has_code: null,
      p_is_customer_only: null,
      p_limit: 25,
      p_offset: 0,
    });
    expect(result.data[0]?.id).toBe('bathroom-1');
  });

  it('falls back to ilike search when both RPCs are missing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.search_directory_listings',
      },
    });
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
      range: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
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

  it('loads search suggestions through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          bathroom_id: 'bathroom-1',
          place_name: 'Central Station',
          city: 'Seattle',
          state: 'WA',
          distance_meters: 220,
        },
      ],
      error: null,
    });

    const { fetchSearchSuggestions } = await import('@/api/bathrooms');
    const result = await fetchSearchSuggestions({
      query: 'cent',
      origin: {
        latitude: 47.61,
        longitude: -122.33,
      },
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_search_suggestions', {
      p_query: 'cent',
      p_user_lat: 47.61,
      p_user_lng: -122.33,
      p_limit: 8,
    });
    expect(result.data).toEqual([
      {
        bathroom_id: 'bathroom-1',
        place_name: 'Central Station',
        city: 'Seattle',
        state: 'WA',
        distance_meters: 220,
      },
    ]);
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
