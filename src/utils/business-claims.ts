import {
  BusinessClaimBathroomSummary,
  BusinessClaimListItem,
  BusinessClaimStatus,
  BusinessClaimStatusCounts,
  Database,
  DbClaim,
} from '@/types';

type BathroomDetailRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

const BLOCKING_CLAIM_STATUSES = new Set<BusinessClaimStatus>(['pending', 'approved']);

export function formatBusinessClaimAddress(bathroom: BathroomDetailRow | null | undefined): string {
  if (!bathroom) {
    return 'Bathroom details unavailable';
  }

  const locality = [bathroom.city, bathroom.state].filter(Boolean).join(', ');

  return [bathroom.address_line1, locality, bathroom.postal_code, bathroom.country_code].filter(Boolean).join(' ');
}

export function toBusinessClaimBathroomSummary(
  bathroom: BathroomDetailRow | null | undefined
): BusinessClaimBathroomSummary | null {
  if (!bathroom) {
    return null;
  }

  return {
    id: bathroom.id,
    place_name: bathroom.place_name,
    address: formatBusinessClaimAddress(bathroom),
    is_locked: bathroom.is_locked,
    is_accessible: bathroom.is_accessible,
    is_customer_only: bathroom.is_customer_only,
  };
}

export function hydrateBusinessClaimListItem(
  claim: DbClaim,
  bathroom: BathroomDetailRow | null | undefined
): BusinessClaimListItem {
  return {
    ...claim,
    bathroom: toBusinessClaimBathroomSummary(bathroom),
  };
}

export function summarizeBusinessClaims(
  claims: Array<{ review_status: BusinessClaimStatus }>
): BusinessClaimStatusCounts {
  return claims.reduce<BusinessClaimStatusCounts>(
    (summary, claim) => ({
      ...summary,
      [claim.review_status]: summary[claim.review_status] + 1,
    }),
    {
      pending: 0,
      approved: 0,
      rejected: 0,
    }
  );
}

export function getBlockingBusinessClaim<T extends { bathroom_id: string; review_status: BusinessClaimStatus }>(
  claims: T[],
  bathroomId: string
): T | null {
  return claims.find(
    (claim) => claim.bathroom_id === bathroomId && BLOCKING_CLAIM_STATUSES.has(claim.review_status)
  ) ?? null;
}
