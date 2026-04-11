import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import type { BusinessCoupon } from '@/types';

interface CouponCardProps {
  coupon: BusinessCoupon;
  onEdit?: (couponId: string) => void;
  onDeactivate: (couponId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  percent_off: '% Off',
  dollar_off: '$ Off',
  bogo: 'BOGO',
  free_item: 'Free Item',
  custom: 'Custom',
};

function formatCouponValue(coupon: BusinessCoupon): string {
  if (coupon.coupon_type === 'percent_off' && coupon.value) {
    return `${coupon.value}% Off`;
  }
  if (coupon.coupon_type === 'dollar_off' && coupon.value) {
    return `$${coupon.value.toFixed(2)} Off`;
  }
  if (coupon.coupon_type === 'bogo') {
    return 'Buy One Get One';
  }
  if (coupon.coupon_type === 'free_item') {
    return 'Free Item';
  }
  return coupon.title;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiration';
  const date = new Date(expiresAt);
  if (date < new Date()) return 'Expired';
  return `Expires ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function CouponCardComponent({ coupon, onEdit, onDeactivate }: CouponCardProps) {
  const handleEdit = useCallback(() => onEdit?.(coupon.id), [coupon.id, onEdit]);
  const handleDeactivate = useCallback(() => onDeactivate(coupon.id), [coupon.id, onDeactivate]);

  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-brand-600/10 px-3 py-1">
              <Text className="text-xs font-bold text-brand-600">
                {TYPE_LABELS[coupon.coupon_type] ?? coupon.coupon_type}
              </Text>
            </View>
            {coupon.premium_only ? (
              <View className="rounded-full bg-ink-900/10 px-3 py-1">
                <Text className="text-xs font-bold text-ink-900">Premium Only</Text>
              </View>
            ) : null}
            {!coupon.is_active ? (
              <View className="rounded-full bg-danger/10 px-3 py-1">
                <Text className="text-xs font-bold text-danger">Inactive</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-2 text-lg font-bold text-ink-900">{coupon.title}</Text>
          {coupon.description ? (
            <Text className="mt-1 text-sm leading-5 text-ink-600">{coupon.description}</Text>
          ) : null}
        </View>
        <Text className="text-2xl font-black text-brand-600">{formatCouponValue(coupon)}</Text>
      </View>

      <View className="mt-3 rounded-2xl bg-surface-base px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Code</Text>
          <Text className="font-mono text-base font-bold text-ink-900">{coupon.coupon_code}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm text-ink-600">
          {coupon.current_redemptions}
          {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''} redeemed
        </Text>
        <Text className="text-sm text-ink-500">{formatExpiry(coupon.expires_at)}</Text>
      </View>

      {coupon.min_purchase ? (
        <Text className="mt-1 text-xs text-ink-500">
          Min. purchase: ${coupon.min_purchase.toFixed(2)}
        </Text>
      ) : null}

      {coupon.is_active ? (
        <View className="mt-3 flex-row gap-3">
          {onEdit ? <Button className="flex-1" label="Edit" onPress={handleEdit} variant="secondary" /> : null}
          <Button className="flex-1" label="Deactivate" onPress={handleDeactivate} variant="ghost" />
        </View>
      ) : null}
    </View>
  );
}

export const CouponCard = memo(CouponCardComponent);
