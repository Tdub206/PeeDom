import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { BusinessDashboardBathroom } from '@/types';
import { getBathroomRouteConversionPercent } from '@/utils/business-dashboard';

interface BusinessLocationCardProps {
  bathroom: BusinessDashboardBathroom;
  onPress: (bathroomId: string) => void;
  activeCouponCount?: number;
}

function StatPill({
  iconName,
  label,
  value,
  tone = 'default',
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <View className="flex-1 rounded-2xl bg-surface-base px-3 py-3">
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={iconName}
          size={14}
          color={tone === 'warning' ? colors.danger : colors.brand[600]}
        />
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-500">
          {label}
        </Text>
      </View>
      <Text
        className={[
          'mt-1.5 text-xl font-black tracking-tight',
          tone === 'warning' ? 'text-danger' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
      </Text>
    </View>
  );
}

function BusinessLocationCardComponent({
  bathroom,
  onPress,
  activeCouponCount = 0,
}: BusinessLocationCardProps) {
  const routePercent = getBathroomRouteConversionPercent(bathroom);
  const visibilityLabel =
    bathroom.requires_premium_access && !bathroom.show_on_free_map
      ? 'Premium only'
      : bathroom.requires_premium_access
        ? 'Premium + Free'
        : 'Public map';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${bathroom.place_name} dashboard`}
      onPress={() => onPress(bathroom.bathroom_id)}
      className="rounded-[28px] border border-surface-strong bg-surface-card p-5"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
              <Ionicons name="storefront" size={18} color="#ffffff" />
            </View>
            <Text className="flex-1 text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
              {bathroom.business_name ?? 'Claimed location'}
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-black tracking-tight text-ink-900">
            {bathroom.place_name}
          </Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-base">
          <Ionicons name="chevron-forward" size={18} color={colors.ink[600]} />
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="rounded-full bg-brand-50 px-3 py-1.5">
          <Text className="text-[10px] font-bold uppercase tracking-[1px] text-brand-700">
            {visibilityLabel}
          </Text>
        </View>
        <View
          className={[
            'rounded-full px-3 py-1.5',
            bathroom.is_location_verified ? 'bg-success/10' : 'bg-surface-base',
          ].join(' ')}
        >
          <Text
            className={[
              'text-[10px] font-bold uppercase tracking-[1px]',
              bathroom.is_location_verified ? 'text-success' : 'text-ink-600',
            ].join(' ')}
          >
            {bathroom.is_location_verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
        {activeCouponCount > 0 ? (
          <View className="rounded-full bg-warning/10 px-3 py-1.5">
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-warning">
              {activeCouponCount} coupon{activeCouponCount === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
        {bathroom.has_active_featured_placement ? (
          <View className="rounded-full bg-ink-900 px-3 py-1.5">
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white">
              Featured
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-2">
        <StatPill
          iconName="eye"
          label="Weekly views"
          value={bathroom.weekly_views.toString()}
        />
        <StatPill
          iconName="navigate"
          label="Route rate"
          value={`${routePercent}%`}
        />
        <StatPill
          iconName="alert-circle"
          label="Open issues"
          tone={bathroom.open_reports > 0 ? 'warning' : 'default'}
          value={bathroom.open_reports.toString()}
        />
      </View>
    </Pressable>
  );
}

export const BusinessLocationCard = memo(BusinessLocationCardComponent);
