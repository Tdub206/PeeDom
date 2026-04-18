'use server';

import { revalidatePath } from 'next/cache';
import { getApprovedLocationById } from '@/lib/business/queries';
import { createBusinessCouponSchema } from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateBusinessCouponResult =
  | { ok: true; couponId: string; couponCode: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

interface CreateBusinessCouponRpcClient {
  rpc(
    fn: 'create_business_coupon',
    args: BusinessWebDatabase['public']['Functions']['create_business_coupon']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

// Server action that creates a coupon via the RLS-protected
// `create_business_coupon` RPC. We still run an application-level
// ownership check (`getApprovedLocationById`) before calling the RPC
// so the same failure modes surface as a friendly error on the web
// surface and as a hard postgres error on the RPC side.
export async function createBusinessCoupon(
  input: unknown
): Promise<CreateBusinessCouponResult> {
  const parsedInput = createBusinessCouponSchema.safeParse(input);

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
      error: parsedInput.error.issues[0]?.message ?? 'Check the coupon fields and try again.',
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

  const rpcClient = supabase as unknown as CreateBusinessCouponRpcClient;
  const { data, error } = await rpcClient.rpc('create_business_coupon', {
    p_bathroom_id: parsedInput.data.bathroom_id,
    p_title: parsedInput.data.title,
    p_description: parsedInput.data.description,
    p_coupon_type: parsedInput.data.coupon_type,
    p_value: parsedInput.data.value,
    p_min_purchase: parsedInput.data.min_purchase,
    p_coupon_code: parsedInput.data.coupon_code,
    p_max_redemptions: parsedInput.data.max_redemptions,
    p_starts_at: new Date().toISOString(),
    p_expires_at: parsedInput.data.expires_at,
    p_premium_only: parsedInput.data.premium_only,
  });

  if (error) {
    return {
      ok: false,
      error: 'Unable to create the coupon right now. Try again in a moment.',
    };
  }

  const result = data as { success: boolean; coupon_id: string; coupon_code: string } | null;

  if (!result || !result.success) {
    return {
      ok: false,
      error: 'The coupon could not be created. Double-check the fields and try again.',
    };
  }

  revalidatePath('/coupons');
  revalidatePath('/hub');
  revalidatePath(`/locations/${parsedInput.data.bathroom_id}`);

  return {
    ok: true,
    couponId: result.coupon_id,
    couponCode: result.coupon_code,
  };
}
