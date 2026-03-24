import { getSupabaseClient } from '@/lib/supabase';

export interface AdminClaimListItem {
  claim_id: string;
  bathroom_id: string;
  claimant_user_id: string;
  business_name: string;
  contact_email: string;
  contact_phone: string | null;
  evidence_url: string | null;
  review_status: string;
  created_at: string;
  place_name: string;
  address: string;
  claimant_display_name: string | null;
  claimant_email: string | null;
}

export interface FeaturedRequestListItem {
  id: string;
  bathroom_id: string;
  business_user_id: string;
  placement_type: string;
  geographic_scope: Record<string, unknown>;
  requested_duration_days: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  // Joined fields
  place_name?: string;
  business_name?: string;
  requester_display_name?: string;
}

export async function fetchPendingClaims(): Promise<{
  data: AdminClaimListItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'list_pending_business_claims' as never,
    );

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as unknown as AdminClaimListItem[]) ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch claims') };
  }
}

export async function moderateClaim(
  claimId: string,
  action: 'approve' | 'reject',
  reason?: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await getSupabaseClient().rpc(
      'moderate_business_claim' as never,
      {
        p_claim_id: claimId,
        p_action: action,
        p_reason: reason ?? null,
      } as never,
    );

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Moderation failed') };
  }
}

export async function fetchPendingFeaturedRequests(): Promise<{
  data: FeaturedRequestListItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('featured_placement_requests' as never)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as unknown as FeaturedRequestListItem[]) ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Failed to fetch requests') };
  }
}

export async function moderateFeaturedRequest(
  requestId: string,
  action: 'approve' | 'reject',
  adminNotes?: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await getSupabaseClient().rpc(
      'moderate_featured_request' as never,
      {
        p_request_id: requestId,
        p_action: action,
        p_admin_notes: adminNotes ?? null,
      } as never,
    );

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Moderation failed') };
  }
}
