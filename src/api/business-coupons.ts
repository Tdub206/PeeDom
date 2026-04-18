import type {
  BusinessCoupon,
  BathroomCouponPublic,
  CreateCouponInput,
  UpdateCouponInput,
  CouponRedemptionResult,
} from '@/types';
import type { Database } from '@/types/database';
import {
  businessCouponSchema,
  bathroomCouponPublicSchema,
  couponRedemptionResultSchema,
  parseSupabaseRows,
  parseSupabaseNullableRow,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface ApiErrorShape {
  code?: string;
  message: string;
}

type BusinessCouponUpdate = Database['public']['Tables']['business_coupons']['Update'];

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function fetchBusinessCoupons(userId: string): Promise<{
  data: BusinessCoupon[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_coupons')
      .select('*')
      .eq('business_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: toAppError(error, 'Unable to load your coupons right now.') };
    }

    const parsed = parseSupabaseRows(
      businessCouponSchema,
      data,
      'business coupons',
      'Unable to load your coupons right now.'
    );

    if (parsed.error) {
      return { data: [], error: parsed.error };
    }

    return { data: parsed.data as BusinessCoupon[], error: null };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your coupons right now.'),
        'Unable to load your coupons right now.'
      ),
    };
  }
}

export async function fetchBathroomCoupons(bathroomId: string): Promise<{
  data: BathroomCouponPublic[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'fetch_bathroom_coupons' as never,
      { p_bathroom_id: bathroomId } as never
    );

    if (error) {
      return { data: [], error: toAppError(error, 'Unable to load coupons for this bathroom.') };
    }

    const parsed = parseSupabaseRows(
      bathroomCouponPublicSchema,
      data,
      'bathroom coupons',
      'Unable to load coupons for this bathroom.'
    );

    if (parsed.error) {
      return { data: [], error: parsed.error };
    }

    return { data: parsed.data as BathroomCouponPublic[], error: null };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load coupons for this bathroom.'),
        'Unable to load coupons for this bathroom.'
      ),
    };
  }
}

export async function createBusinessCoupon(input: CreateCouponInput): Promise<{
  data: { coupon_id: string; coupon_code: string } | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'create_business_coupon' as never,
      {
        p_bathroom_id: input.bathroom_id,
        p_title: input.title,
        p_description: input.description ?? null,
        p_coupon_type: input.coupon_type,
        p_value: input.value ?? null,
        p_min_purchase: input.min_purchase ?? null,
        p_coupon_code: input.coupon_code ?? null,
        p_max_redemptions: input.max_redemptions ?? null,
        p_starts_at: input.starts_at ?? new Date().toISOString(),
        p_expires_at: input.expires_at ?? null,
        p_premium_only: input.premium_only ?? true,
      } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to create the coupon right now.') };
    }

    const result = data as { success: boolean; coupon_id: string; coupon_code: string };

    return {
      data: { coupon_id: result.coupon_id, coupon_code: result.coupon_code },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to create the coupon right now.'),
        'Unable to create the coupon right now.'
      ),
    };
  }
}

export async function updateBusinessCoupon(input: UpdateCouponInput): Promise<{
  data: { success: boolean } | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const updates: BusinessCouponUpdate = { updated_at: new Date().toISOString() };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.value !== undefined) updates.value = input.value;
    if (input.min_purchase !== undefined) updates.min_purchase = input.min_purchase;
    if (input.max_redemptions !== undefined) updates.max_redemptions = input.max_redemptions;
    if (input.expires_at !== undefined) updates.expires_at = input.expires_at;
    if (input.is_active !== undefined) updates.is_active = input.is_active;
    if (input.premium_only !== undefined) updates.premium_only = input.premium_only;

    const { error } = await getSupabaseClient()
      .from('business_coupons' as never)
      .update(updates as never)
      .eq('id', input.coupon_id);

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to update the coupon right now.') };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update the coupon right now.'),
        'Unable to update the coupon right now.'
      ),
    };
  }
}

export async function deactivateBusinessCoupon(couponId: string): Promise<{
  data: { success: boolean } | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const deactivationUpdate: BusinessCouponUpdate = {
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await getSupabaseClient()
      .from('business_coupons' as never)
      .update(deactivationUpdate as never)
      .eq('id', couponId);

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to deactivate the coupon right now.') };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to deactivate the coupon right now.'),
        'Unable to deactivate the coupon right now.'
      ),
    };
  }
}

export async function redeemCoupon(couponId: string): Promise<{
  data: CouponRedemptionResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'redeem_coupon' as never,
      { p_coupon_id: couponId } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to redeem the coupon right now.') };
    }

    const parsed = parseSupabaseNullableRow(
      couponRedemptionResultSchema,
      data,
      'coupon redemption',
      'Unable to redeem the coupon right now.'
    );

    if (parsed.error) {
      return { data: null, error: parsed.error };
    }

    return { data: parsed.data as CouponRedemptionResult | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to redeem the coupon right now.'),
        'Unable to redeem the coupon right now.'
      ),
    };
  }
}
