import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const functionsInvoke: jest.MockedFunction<
  (fn: string, options?: unknown) => Promise<{ data: unknown; error: unknown }>
> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
    functions: {
      invoke: functionsInvoke,
    },
  }),
}));

const analyticsRow = {
  bathroom_id: 'bathroom-1',
  claim_id: 'claim-1',
  place_name: 'Central Station Restroom',
  business_name: 'Central Station',
  total_favorites: 12,
  open_reports: 2,
  avg_cleanliness: 4.25,
  total_ratings: 8,
  weekly_views: 0,
  weekly_unique_visitors: 6,
  monthly_unique_visitors: 14,
  weekly_navigation_count: 4,
  verification_badge_type: 'featured',
  has_verification_badge: true,
  has_active_featured_placement: true,
  active_featured_placements: 1,
  active_offer_count: 2,
  requires_premium_access: true,
  is_location_verified: true,
  location_verified_at: '2026-03-18T08:00:00.000Z',
  pricing_plan: 'lifetime',
  last_updated: '2026-03-19T10:00:00.000Z',
};

describe('business API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
    functionsInvoke.mockReset();
  });

  it('builds business dashboard summary data from analytics rows', async () => {
    rpc.mockResolvedValueOnce({
      data: [analyticsRow],
      error: null,
    });

    const { fetchBusinessDashboard } = await import('@/api/business');
    const result = await fetchBusinessDashboard('user-1');

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_business_dashboard_analytics', {
      p_user_id: 'user-1',
    });
    expect(result.data?.summary).toEqual({
      total_bathrooms: 1,
      total_favorites_across_all: 12,
      total_open_reports: 2,
      avg_rating_across_all: 4.25,
      active_featured_placements: 1,
      verified_locations: 1,
      total_weekly_unique_visitors: 6,
      total_monthly_unique_visitors: 14,
      total_weekly_navigation_count: 4,
      active_offers: 2,
      premium_only_locations: 0,
      lifetime_locations: 1,
    });
  });

  it('loads featured placements for the current business user', async () => {
    const placementsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValueOnce({
        data: [
          {
            id: 'placement-1',
            bathroom_id: 'bathroom-1',
            business_user_id: 'user-1',
            placement_type: 'search_top',
            geographic_scope: {
              city: 'Seattle',
              state: 'WA',
            },
            start_date: '2026-03-19T00:00:00.000Z',
            end_date: '2026-04-19T00:00:00.000Z',
            impressions_count: 25,
            clicks_count: 5,
            status: 'active',
            created_at: '2026-03-19T00:00:00.000Z',
            updated_at: '2026-03-19T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    };

    from.mockReturnValueOnce(placementsQuery);

    const { fetchBusinessFeaturedPlacements } = await import('@/api/business');
    const result = await fetchBusinessFeaturedPlacements('user-1');

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith('business_featured_placements');
    expect(result.data[0]?.placement_type).toBe('search_top');
  });

  it('validates and submits business hours updates through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        hours_source: 'manual',
        updated_at: '2026-03-19T12:00:00.000Z',
      },
      error: null,
    });

    const { updateBusinessBathroomHours } = await import('@/api/business');
    const result = await updateBusinessBathroomHours({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      hours: {
        monday: [{ open: '09:00', close: '17:00' }],
      },
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('update_business_bathroom_hours_v2', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_new_hours: {
        monday: [{ open: '09:00', close: '17:00' }],
      },
      p_hours_source: 'manual',
      p_offset_minutes: null,
      p_google_place_id: null,
    });
  });

  it('loads managed bathroom hours configuration through the business RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        place_name: 'Central Station Restroom',
        hours_json: {
          monday: [{ open: '09:00', close: '17:00' }],
        },
        hours_source: 'google',
        hours_offset_minutes: null,
        google_place_id: 'ChIJ1234567890',
        updated_at: '2026-03-19T12:00:00.000Z',
      },
      error: null,
    });

    const { fetchBusinessBathroomHoursConfig } = await import('@/api/business');
    const result = await fetchBusinessBathroomHoursConfig('550e8400-e29b-41d4-a716-446655440000');

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_business_bathroom_hours_config', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.data?.hours_source).toBe('google');
    expect(result.data?.google_place_id).toBe('ChIJ1234567890');
  });

  it('fetches Google hours and saves them through the v2 hours RPC', async () => {
    functionsInvoke.mockResolvedValueOnce({
      data: {
        provider: 'google_places',
        place_name: 'Central Station Restroom',
        google_place_id: 'ChIJ1234567890',
        time_zone: 'America/Los_Angeles',
        utc_offset_minutes: -420,
        open_now: true,
        hours: {
          monday: [{ open: '09:00', close: '17:00' }],
        },
      },
      error: null,
    });
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        hours_source: 'google',
        updated_at: '2026-03-19T12:00:00.000Z',
      },
      error: null,
    });

    const { refreshBusinessBathroomHoursFromGoogle } = await import('@/api/business');
    const result = await refreshBusinessBathroomHoursFromGoogle({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      google_place_id: 'ChIJ1234567890',
    });

    expect(result.error).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith('google-place-hours', {
      body: {
        placeId: 'ChIJ1234567890',
      },
    });
    expect(rpc).toHaveBeenCalledWith('update_business_bathroom_hours_v2', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_new_hours: {
        monday: [{ open: '09:00', close: '17:00' }],
      },
      p_hours_source: 'google',
      p_offset_minutes: null,
      p_google_place_id: 'ChIJ1234567890',
    });
    expect(result.data?.hours_source).toBe('google');
  });

  it('loads business bathroom settings for a managed location', async () => {
    const settingsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValueOnce({
        data: {
          bathroom_id: 'bathroom-1',
          requires_premium_access: true,
          show_on_free_map: false,
          is_location_verified: true,
          location_verified_at: '2026-03-18T08:00:00.000Z',
          pricing_plan: 'lifetime',
          pricing_plan_granted_at: '2026-03-18T08:00:00.000Z',
          updated_by: 'user-1',
          created_at: '2026-03-18T08:00:00.000Z',
          updated_at: '2026-03-19T08:00:00.000Z',
        },
        error: null,
      }),
    };

    from.mockReturnValueOnce(settingsQuery);

    const { fetchBusinessBathroomSettings } = await import('@/api/business');
    const result = await fetchBusinessBathroomSettings('bathroom-1');

    expect(result.error).toBeNull();
    expect(result.data?.pricing_plan).toBe('lifetime');
    expect(from).toHaveBeenCalledWith('business_bathroom_settings');
  });

  it('submits StallPass map visibility settings through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
          requires_premium_access: true,
          show_on_free_map: false,
          is_location_verified: true,
          location_verified_at: '2026-03-19T12:00:00.000Z',
          pricing_plan: 'standard',
          pricing_plan_granted_at: null,
          updated_by: 'user-1',
          created_at: '2026-03-19T12:00:00.000Z',
          updated_at: '2026-03-19T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { upsertBusinessBathroomSettings } = await import('@/api/business');
    const result = await upsertBusinessBathroomSettings({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      requires_premium_access: true,
      show_on_free_map: false,
      is_location_verified: true,
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('upsert_business_bathroom_settings', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_requires_premium_access: true,
      p_show_on_free_map: false,
      p_is_location_verified: true,
    });
  });

  it('creates or updates a StallPass business promotion through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'offer-1',
          bathroom_id: 'bathroom-1',
          business_user_id: 'user-1',
          title: '10% off coffee',
          description: 'Premium members can claim a discount after using the restroom.',
          offer_type: 'percentage',
          offer_value: 10,
          promo_code: 'STALLPASS10',
          redemption_instructions: 'Show the cashier your StallPass screen.',
          starts_at: null,
          ends_at: null,
          is_active: true,
          redemptions_count: 0,
          created_at: '2026-03-19T12:00:00.000Z',
          updated_at: '2026-03-19T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { upsertBusinessPromotion } = await import('@/api/business');
    const result = await upsertBusinessPromotion({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      title: '10% off coffee',
      description: 'Premium members can claim a discount after using the restroom.',
      offer_type: 'percentage',
      offer_value: 10,
      promo_code: 'STALLPASS10',
      redemption_instructions: 'Show the cashier your StallPass screen.',
      is_active: true,
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('upsert_business_promotion', {
      p_promotion_id: null,
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_title: '10% off coffee',
      p_description: 'Premium members can claim a discount after using the restroom.',
      p_offer_type: 'percentage',
      p_offer_value: 10,
      p_promo_code: 'STALLPASS10',
      p_redemption_instructions: 'Show the cashier your StallPass screen.',
      p_starts_at: null,
      p_ends_at: null,
      p_is_active: true,
    });
  });

  it('returns a validation error before submitting malformed hours', async () => {
    const { updateBusinessBathroomHours } = await import('@/api/business');
    const result = await updateBusinessBathroomHours({
      bathroom_id: 'not-a-uuid',
      hours: {
        monday: [{ open: '99:00', close: '17:00' }],
      },
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Select a valid bathroom');
    expect(rpc).not.toHaveBeenCalled();
  });
});
