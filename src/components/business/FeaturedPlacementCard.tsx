import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BusinessFeaturedPlacement } from '@/types';

function formatPlacementDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildScopeLabel(scope: BusinessFeaturedPlacement['geographic_scope']): string {
  const locationBits = [scope.city, scope.state].filter(Boolean).join(', ');

  if (locationBits && typeof scope.radius_km === 'number') {
    return `${locationBits} within ${scope.radius_km} km`;
  }

  if (locationBits) {
    return locationBits;
  }

  if (typeof scope.radius_km === 'number') {
    return `${scope.radius_km} km radius`;
  }

  return 'Custom coverage';
}

function FeaturedPlacementCardComponent({
  placement,
}: {
  placement: BusinessFeaturedPlacement;
}) {
  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Featured Placement</Text>
          <Text className="mt-2 text-lg font-bold text-ink-900">
            {placement.placement_type.replace('_', ' ')}
          </Text>
        </View>
        <View
          className={[
            'rounded-full px-3 py-1.5',
            placement.status === 'active'
              ? 'bg-success/15'
              : placement.status === 'paused'
                ? 'bg-warning/15'
                : 'bg-surface-base',
          ].join(' ')}
        >
          <Text
            className={[
              'text-[11px] font-black uppercase tracking-[1px]',
              placement.status === 'active'
                ? 'text-success'
                : placement.status === 'paused'
                  ? 'text-warning'
                  : 'text-ink-600',
            ].join(' ')}
          >
            {placement.status}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm leading-6 text-ink-600">{buildScopeLabel(placement.geographic_scope)}</Text>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-surface-base px-3 py-3">
          <Text className="text-lg font-black tracking-tight text-ink-900">{placement.impressions_count}</Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-ink-500">Impressions</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-surface-base px-3 py-3">
          <Text className="text-lg font-black tracking-tight text-ink-900">{placement.clicks_count}</Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-ink-500">Clicks</Text>
        </View>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
        Runs {formatPlacementDate(placement.start_date)} to {formatPlacementDate(placement.end_date)}
      </Text>
    </View>
  );
}

export const FeaturedPlacementCard = memo(FeaturedPlacementCardComponent);
