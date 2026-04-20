'use server';

import { revalidatePath } from 'next/cache';
import { createBusinessClaimSchema } from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateBusinessClaimResult =
  | { ok: true; claimId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

interface SubmitBusinessClaimRpcClient {
  rpc(
    fn: 'submit_business_claim',
    args: BusinessWebDatabase['public']['Functions']['submit_business_claim']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

type SubmitBusinessClaimRow =
  BusinessWebDatabase['public']['Functions']['submit_business_claim']['Returns'][number];

export async function createBusinessClaim(input: unknown): Promise<CreateBusinessClaimResult> {
  const parsedInput = createBusinessClaimSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedInput.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return {
      ok: false,
      error: parsedInput.error.issues[0]?.message ?? 'Check the claim fields and try again.',
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const { data: existingClaims, error: existingClaimsError } = await supabase
    .from('business_claims')
    .select('id, review_status')
    .eq('claimant_user_id', user.id)
    .eq('bathroom_id', parsedInput.data.bathroom_id)
    .in('review_status', ['pending', 'approved'])
    .limit(1);

  if (existingClaimsError) {
    return {
      ok: false,
      error: 'Unable to check existing claims right now. Try again in a moment.',
    };
  }

  if ((existingClaims ?? []).length > 0) {
    return {
      ok: false,
      error: 'You already have a pending or approved claim for this location.',
    };
  }

  const rpcClient = supabase as unknown as SubmitBusinessClaimRpcClient;
  const { data, error } = await rpcClient.rpc('submit_business_claim', {
    p_bathroom_id: parsedInput.data.bathroom_id,
    p_business_name: parsedInput.data.business_name,
    p_contact_email: parsedInput.data.contact_email,
    p_contact_phone: parsedInput.data.contact_phone,
    p_evidence_url: parsedInput.data.evidence_url,
    p_growth_invite_code: null,
  });

  if (error) {
    return {
      ok: false,
      error: mapClaimError(error.message),
    };
  }

  const rows = (data ?? []) as SubmitBusinessClaimRow[];
  const row = rows[0];

  if (!row) {
    return {
      ok: false,
      error: 'The claim could not be submitted. Try again in a moment.',
    };
  }

  revalidatePath('/claims');
  revalidatePath('/hub');

  return {
    ok: true,
    claimId: row.id,
  };
}

function mapClaimError(message: string): string {
  if (/BUSINESS_CLAIM_EXISTS/i.test(message)) {
    return 'You already have a pending or approved claim for this location.';
  }

  if (/AUTH_REQUIRED|not_authenticated/i.test(message)) {
    return 'Your session expired. Sign in again and retry.';
  }

  return 'Unable to submit this claim right now. Try again in a moment.';
}
