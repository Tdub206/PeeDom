import { BusinessClaimCreate, DbClaim } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';
import { getBlockingBusinessClaim } from '@/utils/business-claims';

interface ApiErrorShape {
  code?: string;
  message: string;
}

interface BusinessClaimMutationResponse {
  data: DbClaim | null;
  error: (Error & { code?: string }) | null;
}

interface BusinessClaimsResponse {
  data: DbClaim[];
  error: (Error & { code?: string }) | null;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

function normalizeOptionalText(value?: string): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

async function fetchClaimsForBathroom(
  userId: string,
  bathroomId: string
): Promise<BusinessClaimsResponse> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_claims')
      .select('*')
      .eq('claimant_user_id', userId)
      .eq('bathroom_id', bathroomId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to check existing claims for this bathroom.'),
      };
    }

    return {
      data: (data as DbClaim[] | null) ?? [],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to check existing claims for this bathroom.'),
        'Unable to check existing claims for this bathroom.'
      ),
    };
  }
}

export async function fetchBusinessClaims(userId: string): Promise<BusinessClaimsResponse> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_claims')
      .select('*')
      .eq('claimant_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load your business claims right now.'),
      };
    }

    return {
      data: (data as DbClaim[] | null) ?? [],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your business claims right now.'),
        'Unable to load your business claims right now.'
      ),
    };
  }
}

export async function createBusinessClaim(
  userId: string,
  claimInput: BusinessClaimCreate
): Promise<BusinessClaimMutationResponse> {
  try {
    const existingClaimsResult = await fetchClaimsForBathroom(userId, claimInput.bathroom_id);

    if (existingClaimsResult.error) {
      return {
        data: null,
        error: existingClaimsResult.error,
      };
    }

    const blockingClaim = getBlockingBusinessClaim(existingClaimsResult.data, claimInput.bathroom_id);

    if (blockingClaim) {
      const message =
        blockingClaim.review_status === 'approved'
          ? 'This bathroom already has an approved ownership claim on your account.'
          : 'You already have a pending ownership claim for this bathroom.';

      return {
        data: null,
        error: toAppError(
          {
            code: 'BUSINESS_CLAIM_EXISTS',
            message,
          },
          message
        ),
      };
    }

    const { data, error } = await getSupabaseClient().rpc(
      'submit_business_claim' as never,
      {
        p_bathroom_id: claimInput.bathroom_id,
        p_business_name: claimInput.business_name.trim(),
        p_contact_email: claimInput.contact_email.trim().toLowerCase(),
        p_contact_phone: normalizeOptionalText(claimInput.contact_phone),
        p_evidence_url: normalizeOptionalText(claimInput.evidence_url),
        p_growth_invite_code: normalizeOptionalText(claimInput.growth_invite_code),
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to submit this business claim right now.'),
      };
    }

    return {
      data: ((data as DbClaim[] | null) ?? [])[0] ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to submit this business claim right now.'),
        'Unable to submit this business claim right now.'
      ),
    };
  }
}
