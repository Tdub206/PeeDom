import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
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
  verification_badge_type: 'featured',
  has_verification_badge: true,
  has_active_featured_placement: true,
  active_featured_placements: 1,
  last_updated: '2026-03-19T10:00:00.000Z',
};

describe('business API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
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
    expect(rpc).toHaveBeenCalledWith('update_business_bathroom_hours', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_new_hours: {
        monday: [{ open: '09:00', close: '17:00' }],
      },
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
