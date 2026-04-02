import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('stallpass visits API', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('loads business visit stats through the RPC and parses the response', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          bathroom_id: 'bathroom-1',
          total_visits: 24,
          visits_this_week: 8,
          visits_this_month: 18,
          unique_visitors: 14,
          top_source: 'search',
        },
      ],
      error: null,
    });

    const { fetchBusinessVisitStats } = await import('@/api/stallpass-visits');
    const result = await fetchBusinessVisitStats('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        bathroom_id: 'bathroom-1',
        total_visits: 24,
        visits_this_week: 8,
        visits_this_month: 18,
        unique_visitors: 14,
        top_source: 'search',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_business_visit_stats', {
      p_user_id: 'user-1',
    });
  });

  it('records a StallPass visit through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
        deduplicated: false,
      },
      error: null,
    });

    const { recordStallPassVisit } = await import('@/api/stallpass-visits');
    const result = await recordStallPassVisit('bathroom-1', 'coupon_redeem');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      success: true,
      deduplicated: false,
    });
    expect(rpc).toHaveBeenCalledWith('record_stallpass_visit', {
      p_bathroom_id: 'bathroom-1',
      p_source: 'coupon_redeem',
    });
  });

  it('updates free-map visibility through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
      },
      error: null,
    });

    const { toggleFreeMapVisibility } = await import('@/api/stallpass-visits');
    const result = await toggleFreeMapVisibility('bathroom-1', false);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      success: true,
    });
    expect(rpc).toHaveBeenCalledWith('toggle_free_map_visibility', {
      p_bathroom_id: 'bathroom-1',
      p_show_on_free_map: false,
    });
  });
});
