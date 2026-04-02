import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BusinessVisitStats } from '@/types';

interface VisitAnalyticsCardProps {
  stats: BusinessVisitStats;
}

const SOURCE_LABELS: Record<string, string> = {
  map_navigation: 'Map',
  search: 'Search',
  favorite: 'Favorites',
  coupon_redeem: 'Coupons',
  deep_link: 'Direct Link',
};

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-ink-600">{label}</Text>
      <Text className="text-sm font-bold text-ink-900">{value}</Text>
    </View>
  );
}

function VisitAnalyticsCardComponent({ stats }: VisitAnalyticsCardProps) {
  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card p-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
        StallPass Visits
      </Text>
      <View className="mt-3">
        <StatRow label="Total Visits" value={stats.total_visits} />
        <StatRow label="This Week" value={stats.visits_this_week} />
        <StatRow label="This Month" value={stats.visits_this_month} />
        <StatRow label="Unique Visitors" value={stats.unique_visitors} />
        <StatRow
          label="Top Source"
          value={stats.top_source ? (SOURCE_LABELS[stats.top_source] ?? stats.top_source) : 'N/A'}
        />
      </View>
    </View>
  );
}

export const VisitAnalyticsCard = memo(VisitAnalyticsCardComponent);
