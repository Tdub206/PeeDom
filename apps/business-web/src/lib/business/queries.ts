import type { BusinessDashboardBathroom } from '@mobile/types/index';
import {
  businessCouponRowsSchema,
  businessDashboardAnalyticsRowsSchema,
  businessLocationCodeRowsSchema,
  type BusinessCouponRow,
  type BusinessLocationCodeRow,
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

export type { BusinessCouponRow, BusinessLocationCodeRow } from '@/lib/business/schemas';

export interface BusinessCouponsQueryResult {
  coupons: BusinessCouponRow[];
  error: string | null;
}

export interface BusinessLocationCodesQueryResult {
  codes: BusinessLocationCodeRow[];
  error: string | null;
}

type BusinessClaimRow = Pick<
  BusinessWebDatabase['public']['Tables']['business_claims']['Row'],
  | 'id'
  | 'bathroom_id'
  | 'business_name'
  | 'contact_email'
  | 'contact_phone'
  | 'evidence_url'
  | 'review_status'
  | 'reviewed_at'
  | 'created_at'
>;

type FeaturedPlacementRow = Pick<
  BusinessWebDatabase['public']['Tables']['business_featured_placements']['Row'],
  | 'id'
  | 'bathroom_id'
  | 'placement_type'
  | 'start_date'
  | 'end_date'
  | 'impressions_count'
  | 'clicks_count'
  | 'status'
  | 'created_at'
>;

type BlockingClaimRow = Pick<
  BusinessWebDatabase['public']['Tables']['business_claims']['Row'],
  'bathroom_id' | 'review_status'
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

export interface PendingClaimsCountResult {
  count: number;
  error: string | null;
}

export interface BusinessClaimListItem {
  id: string;
  bathroom_id: string;
  business_name: string;
  contact_email: string;
  contact_phone: string | null;
  evidence_url: string | null;
  review_status: BusinessWebDatabase['public']['Tables']['business_claims']['Row']['review_status'];
  reviewed_at: string | null;
  created_at: string;
  location_name: string;
  address: string;
}

export interface BusinessClaimsQueryResult {
  claims: BusinessClaimListItem[];
  error: string | null;
}

export interface ClaimableBathroomOption {
  id: string;
  place_name: string;
  address: string;
}

export interface ClaimableBathroomsQueryResult {
  bathrooms: ClaimableBathroomOption[];
  error: string | null;
}

export interface BusinessFeaturedPlacementSummary extends FeaturedPlacementRow {
  location_name: string;
  address: string;
}

export interface BusinessFeaturedPlacementsQueryResult {
  placements: BusinessFeaturedPlacementSummary[];
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

export async function getPendingClaimsCount(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<PendingClaimsCountResult> {
  const { count, error } = await supabase
    .from('business_claims')
    .select('id', { count: 'exact', head: true })
    .eq('claimant_user_id', userId)
    .eq('review_status', 'pending');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function getBusinessClaims(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<BusinessClaimsQueryResult> {
  const { data: claimsData, error: claimsError } = await supabase
    .from('business_claims')
    .select('id, bathroom_id, business_name, contact_email, contact_phone, evidence_url, review_status, reviewed_at, created_at')
    .eq('claimant_user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<BusinessClaimRow[]>();

  if (claimsError) {
    return { claims: [], error: claimsError.message };
  }

  const claims = claimsData ?? [];
  const bathroomIds = [...new Set(claims.map((claim) => claim.bathroom_id))];

  if (!bathroomIds.length) {
    return { claims: [], error: null };
  }

  const { data: bathroomsData, error: bathroomsError } = await supabase
    .from('bathrooms')
    .select('id, place_name, address_line1, city, state, postal_code, show_on_free_map, updated_at')
    .in('id', bathroomIds)
    .overrideTypes<BathroomRow[]>();

  if (bathroomsError) {
    return { claims: [], error: bathroomsError.message };
  }

  const bathroomsById = new Map((bathroomsData ?? []).map((bathroom) => [bathroom.id, bathroom] as const));

  return {
    claims: claims.map((claim) => {
      const bathroom = bathroomsById.get(claim.bathroom_id);

      return {
        ...claim,
        location_name: bathroom?.place_name ?? claim.business_name,
        address: bathroom ? formatBathroomAddress(bathroom) : 'Address unavailable',
      };
    }),
    error: null,
  };
}

export async function getClaimableBathrooms(
  supabase: BusinessSupabaseClient,
  userId: string,
  limit = 75
): Promise<ClaimableBathroomsQueryResult> {
  const { data: existingClaimsData, error: existingClaimsError } = await supabase
    .from('business_claims')
    .select('bathroom_id, review_status')
    .eq('claimant_user_id', userId)
    .in('review_status', ['pending', 'approved'])
    .overrideTypes<BlockingClaimRow[]>();

  if (existingClaimsError) {
    return { bathrooms: [], error: existingClaimsError.message };
  }

  const blockedBathroomIds = new Set(
    (existingClaimsData ?? []).map((claim) => claim.bathroom_id)
  );

  const { data, error } = await supabase
    .from('bathrooms')
    .select('id, place_name, address_line1, city, state, postal_code, show_on_free_map, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit * 3)
    .overrideTypes<BathroomRow[]>();

  if (error) {
    return { bathrooms: [], error: error.message };
  }

  const bathrooms = (data ?? [])
    .filter((bathroom) => !blockedBathroomIds.has(bathroom.id))
    .slice(0, limit)
    .map((bathroom) => ({
      id: bathroom.id,
      place_name: bathroom.place_name,
      address: formatBathroomAddress(bathroom),
    }));

  return { bathrooms, error: null };
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

interface GetBusinessLocationCodesRpcClient {
  rpc(
    fn: 'get_business_location_codes',
    args: BusinessWebDatabase['public']['Functions']['get_business_location_codes']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

// Reads every access code (active + historical) attached to a single
// approved location. The RPC `get_business_location_codes` re-checks the
// approved business_claim on the DB side — we still run the same
// ownership guard here so the web surface fails friendly before hitting
// the network when the caller does not own the bathroom.
export async function getBusinessLocationCodes(
  supabase: BusinessSupabaseClient,
  userId: string,
  bathroomId: string
): Promise<BusinessLocationCodesQueryResult> {
  const ownership = await getApprovedLocationById(supabase, userId, bathroomId);

  if (ownership.error) {
    return { codes: [], error: ownership.error };
  }

  if (!ownership.location) {
    return { codes: [], error: 'Location not found on your account.' };
  }

  const rpcClient = supabase as unknown as GetBusinessLocationCodesRpcClient;
  const { data, error } = await rpcClient.rpc('get_business_location_codes', {
    p_bathroom_id: bathroomId,
  });

  if (error) {
    return { codes: [], error: 'Unable to load codes right now.' };
  }

  const parsed = businessLocationCodeRowsSchema.safeParse(data ?? []);

  if (!parsed.success) {
    return { codes: [], error: 'Unable to load codes right now.' };
  }

  return { codes: parsed.data, error: null };
}

export async function getBusinessFeaturedPlacements(
  supabase: BusinessSupabaseClient,
  userId: string
): Promise<BusinessFeaturedPlacementsQueryResult> {
  const { data, error } = await supabase
    .from('business_featured_placements')
    .select('id, bathroom_id, placement_type, start_date, end_date, impressions_count, clicks_count, status, created_at')
    .eq('business_user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<FeaturedPlacementRow[]>();

  if (error) {
    return { placements: [], error: error.message };
  }

  const placements = data ?? [];
  const bathroomIds = [...new Set(placements.map((placement) => placement.bathroom_id))];

  if (!bathroomIds.length) {
    return { placements: [], error: null };
  }

  const { data: bathroomsData, error: bathroomsError } = await supabase
    .from('bathrooms')
    .select('id, place_name, address_line1, city, state, postal_code, show_on_free_map, updated_at')
    .in('id', bathroomIds)
    .overrideTypes<BathroomRow[]>();

  if (bathroomsError) {
    return { placements: [], error: bathroomsError.message };
  }

  const bathroomsById = new Map((bathroomsData ?? []).map((bathroom) => [bathroom.id, bathroom] as const));

  return {
    placements: placements.map((placement) => {
      const bathroom = bathroomsById.get(placement.bathroom_id);

      return {
        ...placement,
        location_name: bathroom?.place_name ?? 'Managed location',
        address: bathroom ? formatBathroomAddress(bathroom) : 'Address unavailable',
      };
    }),
    error: null,
  };
}
