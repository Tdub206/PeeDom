import { getSupabaseClient } from '@/lib/supabase';

export interface RequestFeaturedPlacementInput {
  bathroom_id: string;
  placement_type: 'search_top' | 'map_priority' | 'nearby_featured';
  geographic_scope: Record<string, unknown>;
  duration_days: number;
}

export async function requestFeaturedPlacement(
  input: RequestFeaturedPlacementInput,
): Promise<{ requestId: string | null; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'request_featured_placement' as never,
      {
        p_bathroom_id: input.bathroom_id,
        p_placement_type: input.placement_type,
        p_geographic_scope: input.geographic_scope,
        p_duration_days: input.duration_days,
      } as never,
    );

    if (error) {
      return { requestId: null, error: new Error(error.message) };
    }

    const result = data as unknown as { success: boolean; request_id: string };
    return { requestId: result.request_id, error: null };
  } catch (err) {
    return {
      requestId: null,
      error: err instanceof Error ? err : new Error('Failed to submit request'),
    };
  }
}

export async function cancelFeaturedRequest(
  requestId: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await getSupabaseClient()
      .from('featured_placement_requests' as never)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() } as never)
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Failed to cancel request'),
    };
  }
}
