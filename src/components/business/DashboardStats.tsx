import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BusinessDashboardSummary } from '@/types';

interface StatTileProps {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}

function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <View
      className={[
        'min-h-[120px] flex-1 rounded-[24px] border px-4 py-4',
        tone === 'warning'
          ? 'border-danger/20 bg-danger/10'
          : 'border-surface-strong bg-surface-card',
      ].join(' ')}
    >
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <Text
        className={[
          'mt-3 text-3xl font-black tracking-tight',
          tone === 'warning' ? 'text-danger' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
      </Text>
    </View>
  );
}

interface DashboardStatsProps {
  summary: BusinessDashboardSummary;
}

function DashboardStatsComponent({ summary }: DashboardStatsProps) {
  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Business Overview</Text>
      <View className="mt-4 flex-row gap-3">
        <StatTile label="Locations" value={summary.total_bathrooms.toString()} />
        <StatTile label="Favorites" value={summary.total_favorites_across_all.toString()} />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          label="Open Reports"
          tone={summary.total_open_reports > 0 ? 'warning' : 'default'}
          value={summary.total_open_reports.toString()}
        />
        <StatTile label="Avg Rating" value={summary.avg_rating_across_all.toFixed(1)} />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile label="Verified" value={summary.verified_locations.toString()} />
        <StatTile label="Featured" value={summary.active_featured_placements.toString()} />
      </View>
    </View>
  );
}

export const DashboardStats = memo(DashboardStatsComponent);
