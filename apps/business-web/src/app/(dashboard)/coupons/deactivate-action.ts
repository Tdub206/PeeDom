'use server';

import { revalidatePath } from 'next/cache';
import {
  businessCouponIdSchema,
  businessCouponOwnershipRowSchema,
} from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type DeactivateBusinessCouponResult = { ok: true } | { ok: false; error: string };

type CouponOwnershipRow = Pick<
  BusinessWebDatabase['public']['Tables']['business_coupons']['Row'],
  'id' | 'business_user_id'
>;

export async function deactivateBusinessCoupon(
  couponId: string
): Promise<DeactivateBusinessCouponResult> {
  try {
    const parsedCouponId = businessCouponIdSchema.safeParse(couponId);

    if (!parsedCouponId.success) {
      return {
        ok: false,
        error:
          parsedCouponId.error.issues[0]?.message ?? 'Select a valid coupon before updating it.',
      };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: 'Your session expired. Sign in again and retry.' };
    }

    const { data: coupon, error: couponError } = await supabase
      .from('business_coupons')
      .select('id, business_user_id')
      .eq('id', parsedCouponId.data)
      .maybeSingle()
      .overrideTypes<CouponOwnershipRow, { merge: false }>();

    if (couponError) {
      return {
        ok: false,
        error: 'Unable to verify this coupon right now. Try again in a moment.',
      };
    }

    if (!coupon) {
      return { ok: false, error: "We couldn't find that coupon on your account." };
    }

    const parsedCoupon = businessCouponOwnershipRowSchema.safeParse(coupon);

    if (!parsedCoupon.success || parsedCoupon.data.business_user_id !== user.id) {
      return { ok: false, error: "We couldn't find that coupon on your account." };
    }

    const updates: BusinessWebDatabase['public']['Tables']['business_coupons']['Update'] = {
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('business_coupons' as never)
      .update(updates as never)
      .eq('id', parsedCoupon.data.id)
      .eq('business_user_id', user.id);

    if (updateError) {
      return {
        ok: false,
        error: 'Unable to deactivate the coupon right now. Try again in a moment.',
      };
    }

    revalidatePath('/coupons');
    revalidatePath('/hub');

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Unable to deactivate the coupon right now. Try again in a moment.',
    };
  }
}
