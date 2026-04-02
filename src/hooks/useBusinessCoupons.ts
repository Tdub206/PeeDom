import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBusinessCoupon,
  deactivateBusinessCoupon,
  fetchBathroomCoupons,
  fetchBusinessCoupons,
  redeemCoupon,
  updateBusinessCoupon,
} from '@/api/business-coupons';
import { useAuth } from '@/contexts/AuthContext';
import type {
  BathroomCouponPublic,
  BusinessCoupon,
  CouponRedemptionResult,
  CreateCouponInput,
  UpdateCouponInput,
} from '@/types';

export const couponQueryKeys = {
  all: ['coupons'] as const,
  businessCoupons: (userId: string) => [...couponQueryKeys.all, 'business', userId] as const,
  bathroomCoupons: (bathroomId: string) => [...couponQueryKeys.all, 'bathroom', bathroomId] as const,
};

export function useBusinessCoupons(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<BusinessCoupon[], Error>({
    queryKey: couponQueryKeys.businessCoupons(user?.id ?? 'guest'),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const result = await fetchBusinessCoupons(user.id);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useBathroomCoupons(bathroomId: string | null, options?: { enabled?: boolean }) {
  return useQuery<BathroomCouponPublic[], Error>({
    queryKey: couponQueryKeys.bathroomCoupons(bathroomId ?? 'none'),
    enabled: Boolean(bathroomId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) {
        return [];
      }

      const result = await fetchBathroomCoupons(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useCreateCoupon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ coupon_id: string; coupon_code: string }, Error, CreateCouponInput>({
    mutationFn: async (input) => {
      const result = await createBusinessCoupon(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to create the coupon right now.');
      }

      return result.data;
    },
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: couponQueryKeys.businessCoupons(user.id),
        });
      }
    },
  });
}

export function useUpdateCoupon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, UpdateCouponInput>({
    mutationFn: async (input) => {
      const result = await updateBusinessCoupon(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to update the coupon right now.');
      }

      return result.data;
    },
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: couponQueryKeys.businessCoupons(user.id),
        });
      }
    },
  });
}

export function useDeactivateCoupon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (couponId) => {
      const result = await deactivateBusinessCoupon(couponId);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to deactivate the coupon right now.');
      }

      return result.data;
    },
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: couponQueryKeys.businessCoupons(user.id),
        });
      }
    },
  });
}

export function useRedeemCoupon() {
  const queryClient = useQueryClient();

  return useMutation<CouponRedemptionResult, Error, string>({
    mutationFn: async (couponId) => {
      const result = await redeemCoupon(couponId);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to redeem the coupon right now.');
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: couponQueryKeys.all });
    },
  });
}
