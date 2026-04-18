import type { BusinessDashboardBathroom } from '@mobile/types/index';
import {
  businessClaimRowsSchema,
  businessCouponRowsSchema,
  businessDashboardAnalyticsRowsSchema,
  featuredPlacementRowsSchema,
  type BusinessClaimRow,
  type BusinessCouponRow,
  type FeaturedPlacementRow,
} from '@/lib/business/schemas';
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

export type { BusinessClaimRow, BusinessCouponRow, FeaturedPlacementRow } from '@/lib/business/schemas';

export interface BusinessCouponsQueryResult {
  coupons: BusinessCouponRow[];
  error: string | null;
}

export interface BusinessClaimsQueryResult {
  claims: (BusinessClaimRow & { place_name: string | null; address: string | null })[];
  error: string | null;
}

export interface FeaturedPlacementsQueryResult {
  placements: FeaturedPlacementRow[];
  error: string | null;
}

export interface AccessCodesQueryResult {
  codes: AccessCodeRow[];
  error: string | null;
}

export interface AccessCodeRow {
  id: string;
  bathroom_id: string;
  code_value: string;
  confidence_score: number;
  up_votes: number;
  down_votes: number;
  visibility_status: 'visible' | 'needs_review' | 'removed';
  lifecycle_status: 'active' | 'expired' | 'superseded';
  last_verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

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

// Loads every coupon owned by the caller. Mirrors the mobile
// `fetchBusinessCoupons` path: RLS policy `coupons_select_own` makes
// sure only `business_user_id = auth.uid()` rows come back. We still
// validate the result with zod so schema drift surfaces as a
// user-facing error instead of a silent cast.
export async function getBusinessCoupons(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<BusinessCouponsQueryResult> {
  const { data, error } = await supabase
    .from('business_coupons')
    .select('*')
    .eq('business_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { coupons: [], error: error.message };
  }

  const parsed = businessCouponRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    return {
      coupons: [],
      error: 'Unable to load your coupons right now.',
    };
  }

  return { coupons: parsed.data, error: null };
}

// All claims (pending + approved + rejected) for the caller, joined
// to the bathroom's name and address for display context. RLS
// `claims_select_own` means only `claimant_user_id = auth.uid()` rows
// come back.
export async function getBusinessClaims(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<BusinessClaimsQueryResult> {
  const { data, error } = await supabase
    .from('business_claims')
    .select('*')
    .eq('claimant_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { claims: [], error: error.message };
  }

  const parsed = businessClaimRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    return { claims: [], error: 'Unable to load your claim history right now.' };
  }

  const bathroomIds = [...new Set(parsed.data.map((claim) => claim.bathroom_id))];

  if (!bathroomIds.length) {
    return { claims: parsed.data.map((claim) => ({ ...claim, place_name: null, address: null })), error: null };
  }

  type ClaimBathroomRow = Pick<BathroomRow, 'id' | 'place_name' | 'address_line1' | 'city' | 'state' | 'postal_code'>;

  const { data: bathroomsData } = await supabase
    .from('bathrooms')
    .select('id, place_name, address_line1, city, state, postal_code')
    .in('id', bathroomIds)
    .overrideTypes<ClaimBathroomRow[]>();

  const bathroomsById = new Map(
    (bathroomsData ?? []).map((bathroom) => {
      const addressParts = [
        bathroom.address_line1,
        [bathroom.city, bathroom.state].filter(isDefined).join(', '),
        bathroom.postal_code,
      ].filter(isDefined);
      return [
        bathroom.id,
        {
          place_name: bathroom.place_name,
          address: addressParts.join(', ') || 'Address unavailable',
        },
      ] as const;
    })
  );

  const enriched = parsed.data.map((claim) => {
    const info = bathroomsById.get(claim.bathroom_id);
    return {
      ...claim,
      place_name: info?.place_name ?? null,
      address: info?.address ?? null,
    };
  });

  return { claims: enriched, error: null };
}

// Featured placements owned by the caller. RLS
// `business_featured_placements_select_own` enforces
// `business_user_id = auth.uid()`.
export async function getFeaturedPlacements(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<FeaturedPlacementsQueryResult> {
  const { data, error } = await supabase
    .from('business_featured_placements')
    .select('*')
    .eq('business_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { placements: [], error: error.message };
  }

  const parsed = featuredPlacementRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    return { placements: [], error: 'Unable to load your featured placements right now.' };
  }

  return { placements: parsed.data, error: null };
}

// Access codes for the caller's approved bathroom IDs. We first
// resolve which bathrooms the caller owns, then fetch codes for those
// bathrooms. The `codes_select_revealed_or_owner` policy lets the
// submitter see their own codes plus visible+active codes.
export async function getAccessCodesForOwnedLocations(
  supabase: BusinessSupabaseClient,
  _userId: string,
  bathroomIds: string[]
): Promise<AccessCodesQueryResult> {
  if (!bathroomIds.length) {
    return { codes: [], error: null };
  }

  const { data, error } = await supabase
    .from('bathroom_access_codes')
    .select('id, bathroom_id, code_value, confidence_score, up_votes, down_votes, visibility_status, lifecycle_status, last_verified_at, expires_at, created_at, updated_at')
    .in('bathroom_id', bathroomIds)
    .order('created_at', { ascending: false })
    .overrideTypes<AccessCodeRow[]>();

  if (error) {
    return { codes: [], error: error.message };
  }

  return { codes: data ?? [], error: null };
}
