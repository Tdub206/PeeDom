import type { BusinessDashboardBathroom } from '@mobile/types/index';
import { businessDashboardAnalyticsRowsSchema } from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import type { BusinessSupabaseClient } from '@/lib/supabase/server';

type ApprovedClaimRow = Pick<
  BusinessWebDatabase['public']['Tables']['business_claims']['Row'],
  'id' | 'bathroom_id' | 'business_name' | 'is_lifetime_free'
>;

type BathroomRow = Pick<
  BusinessWebDatabase['public']['Tables']['bathrooms']['Row'],
  'id' | 'place_name' | 'address_line1' | 'city' | 'state' | 'postal_code' | 'show_on_free_map' | 'updated_at'
>;

export type ApprovedLocation = BusinessDashboardBathroom & {
  address: string;
};

export interface ApprovedLocationQueryResult {
  locations: ApprovedLocation[];
  error: string | null;
}

export interface ApprovedLocationByIdResult {
  location: ApprovedLocation | null;
  error: string | null;
}

interface AnalyticsRpcClient {
  rpc(
    fn: 'get_business_dashboard_analytics',
    args: BusinessWebDatabase['public']['Functions']['get_business_dashboard_analytics']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export async function getApprovedLocations(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<ApprovedLocationQueryResult> {
  const { data: claimsData, error: claimsError } = await supabase
    .from('business_claims')
    .select('id, bathroom_id, business_name, is_lifetime_free')
    .eq('claimant_user_id', userId)
    .eq('review_status', 'approved')
    .order('reviewed_at', { ascending: false })
    .overrideTypes<ApprovedClaimRow[]>();

  if (claimsError) {
    return {
      locations: [],
      error: claimsError.message,
    };
  }

  const claims = claimsData ?? [];
  const bathroomIds = [...new Set(claims.map((claim) => claim.bathroom_id))];

  if (!bathroomIds.length) {
    return {
      locations: [],
      error: null,
    };
  }

  const [
    { data: bathroomsData, error: bathroomsError },
    { data: analyticsData, error: analyticsError },
  ] = await Promise.all([
    supabase
      .from('bathrooms')
      .select('id, place_name, address_line1, city, state, postal_code, show_on_free_map, updated_at')
      .in('id', bathroomIds)
      .overrideTypes<BathroomRow[]>(),
    (supabase as unknown as AnalyticsRpcClient).rpc('get_business_dashboard_analytics', {
      p_user_id: userId,
    }),
  ]);

  if (bathroomsError) {
    return {
      locations: [],
      error: bathroomsError.message,
    };
  }

  if (analyticsError) {
    return {
      locations: [],
      error: analyticsError.message,
    };
  }

  const bathroomsById = new Map((bathroomsData ?? []).map((bathroom) => [bathroom.id, bathroom] as const));
  const parsedAnalytics = businessDashboardAnalyticsRowsSchema.safeParse(analyticsData ?? []);

  if (!parsedAnalytics.success) {
    return {
      locations: [],
      error: 'Unable to load your managed locations right now.',
    };
  }

  const analyticsRows: BusinessDashboardBathroom[] = parsedAnalytics.data;
  const analyticsByBathroomId = new Map(
    analyticsRows.map((location) => [location.bathroom_id, location] as const)
  );

  const locations = claims.flatMap((claim) => {
    const bathroom = bathroomsById.get(claim.bathroom_id);

    if (!bathroom) {
      return [];
    }

    return [hydrateApprovedLocation(claim, bathroom, analyticsByBathroomId.get(claim.bathroom_id) ?? null)];
  });

  return {
    locations,
    error: null,
  };
}

// Ownership-safe single-location lookup. Reuses getApprovedLocations
// so the ownership check is the SAME code path as the list page —
// if the caller's approved set doesn't include `bathroomId`, we
// return null and the page renders "not found". There is no branch
// that can skip the claim check.
export async function getApprovedLocationById(
  supabase: BusinessSupabaseClient,
  userId: string,
  bathroomId: string
): Promise<ApprovedLocationByIdResult> {
  const { locations, error } = await getApprovedLocations(supabase, userId);

  if (error) {
    return { location: null, error };
  }

  const location = locations.find((candidate) => candidate.bathroom_id === bathroomId) ?? null;

  return { location, error: null };
}

function hydrateApprovedLocation(
  claim: ApprovedClaimRow,
  bathroom: BathroomRow,
  analytics: BusinessDashboardBathroom | null
): ApprovedLocation {
  if (analytics) {
    return {
      ...analytics,
      claim_id: claim.id,
      place_name: bathroom.place_name,
      business_name: claim.business_name,
      address: formatBathroomAddress(bathroom),
    };
  }

  return {
    bathroom_id: bathroom.id,
    claim_id: claim.id,
    place_name: bathroom.place_name,
    business_name: claim.business_name,
    total_favorites: 0,
    open_reports: 0,
    avg_cleanliness: 0,
    total_ratings: 0,
    weekly_views: 0,
    weekly_unique_visitors: 0,
    monthly_unique_visitors: 0,
    weekly_navigation_count: 0,
    verification_badge_type: null,
    has_verification_badge: false,
    has_active_featured_placement: false,
    active_featured_placements: 0,
    active_offer_count: 0,
    requires_premium_access: false,
    show_on_free_map: bathroom.show_on_free_map,
    is_location_verified: false,
    location_verified_at: null,
    pricing_plan: claim.is_lifetime_free ? 'lifetime' : 'standard',
    last_updated: bathroom.updated_at,
    address: formatBathroomAddress(bathroom),
  };
}

function formatBathroomAddress(bathroom: BathroomRow): string {
  const localityParts = [bathroom.city, bathroom.state].filter(isDefined);
  const locality = localityParts.join(', ');
  const trailingParts = [locality, bathroom.postal_code].filter(isDefined);
  const trailing = trailingParts.join(' ');
  const addressParts = [bathroom.address_line1, trailing].filter(isDefined);

  return addressParts.join(', ') || 'Address unavailable';
}

function isDefined(value: string | null): value is string {
  return Boolean(value);
}
