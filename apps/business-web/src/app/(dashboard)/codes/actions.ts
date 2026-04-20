'use server';

import { revalidatePath } from 'next/cache';
import { getApprovedLocationById } from '@/lib/business/queries';
import { submitBusinessOwnerCodeSchema } from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SubmitBusinessOwnerCodeResult =
  | { ok: true; codeId: string; createdAt: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

interface SubmitBusinessOwnerCodeRpcClient {
  rpc(
    fn: 'submit_business_owner_access_code',
    args: BusinessWebDatabase['public']['Functions']['submit_business_owner_access_code']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

type SubmitRpcRow = BusinessWebDatabase['public']['Functions']['submit_business_owner_access_code']['Returns'][number];

// Server action that publishes an authoritative access code on behalf of the
// approved business owner. Mirrors the coupon action shape: validate with
// zod first, re-run the ownership guard, then call the RPC that also
// re-checks the claim on the DB side.
export async function submitBusinessOwnerCode(
  input: unknown
): Promise<SubmitBusinessOwnerCodeResult> {
  const parsedInput = submitBusinessOwnerCodeSchema.safeParse(input);

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
      error: parsedInput.error.issues[0]?.message ?? 'Check the code fields and try again.',
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

  const ownershipCheck = await getApprovedLocationById(
    supabase,
    user.id,
    parsedInput.data.bathroom_id
  );

  if (ownershipCheck.error) {
    return {
      ok: false,
      error: 'Unable to verify this location right now. Try again in a moment.',
    };
  }

  if (!ownershipCheck.location) {
    return { ok: false, error: "We couldn't find that location on your account." };
  }

  const rpcClient = supabase as unknown as SubmitBusinessOwnerCodeRpcClient;
  const { data, error } = await rpcClient.rpc('submit_business_owner_access_code', {
    p_bathroom_id: parsedInput.data.bathroom_id,
    p_code_value: parsedInput.data.code_value,
  });

  if (error) {
    return { ok: false, error: mapSubmitError(error.message) };
  }

  const rows = (data ?? []) as SubmitRpcRow[];
  const row = rows[0];

  if (!row) {
    return {
      ok: false,
      error: 'The code could not be saved. Try again in a moment.',
    };
  }

  revalidatePath('/codes');
  revalidatePath('/hub');
  revalidatePath(`/locations/${parsedInput.data.bathroom_id}`);

  return { ok: true, codeId: row.code_id, createdAt: row.created_at };
}

function mapSubmitError(message: string): string {
  if (message.includes('NOT_BUSINESS_OWNER')) {
    return "You no longer have an approved claim for this location. Refresh and try again.";
  }

  if (message.includes('INVALID_CODE_VALUE')) {
    return 'Enter a non-empty code before saving.';
  }

  if (message.includes('AUTH_REQUIRED')) {
    return 'Your session expired. Sign in again and retry.';
  }

  return 'Unable to publish the code right now. Try again in a moment.';
}
