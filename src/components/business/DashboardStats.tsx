import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import type { BusinessDashboardBathroom, BusinessDashboardSummary } from '@/types';
import { buildBusinessDashboardInsights, calculateBusinessHealthSummary } from '@/utils/business-dashboard';

interface StatTileProps {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
  helper?: string;
}

function StatTile({ label, value, tone = 'default', helper }: StatTileProps) {
  return (
    <View
      className={[
        'min-h-[132px] flex-1 rounded-[24px] border px-4 py-4',
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
      {helper ? <Text className="mt-2 text-xs leading-5 text-ink-500">{helper}</Text> : null}
    </View>
  );
}

interface DashboardStatsProps {
  summary: BusinessDashboardSummary;
  bathrooms: BusinessDashboardBathroom[];
}

function DashboardStatsComponent({ summary, bathrooms }: DashboardStatsProps) {
  const health = useMemo(
    () => calculateBusinessHealthSummary(summary, bathrooms),
    [bathrooms, summary]
  );
  const insights = useMemo(
    () => buildBusinessDashboardInsights(summary, bathrooms),
    [bathrooms, summary]
  );

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Business Overview</Text>
      <Text className="mt-2 text-sm leading-6 text-ink-600">
        These totals show whether StallPass is driving discovery, routes, and trust for your claimed locations.
      </Text>
      <View className="mt-4 flex-row gap-3">
        <StatTile label="Locations" value={summary.total_bathrooms.toString()} />
        <StatTile
          helper="Badge + location confirmed"
          label="Official Coverage"
          value={`${health.official_coverage_percent}%`}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          helper="Unique weekly restroom viewers"
          label="Weekly Reach"
          value={summary.total_weekly_unique_visitors.toString()}
        />
        <StatTile
          helper="Visitors who started navigation"
          label="Route Rate"
          value={`${health.discovery_to_route_percent}%`}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          label="Open Issues"
          tone={summary.total_open_reports > 0 ? 'warning' : 'default'}
          value={summary.total_open_reports.toString()}
        />
        <StatTile
          helper="Locations with unresolved trust gaps"
          label="Needs Attention"
          tone={health.bathrooms_needing_attention > 0 ? 'warning' : 'default'}
          value={health.bathrooms_needing_attention.toString()}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          helper="Average community rating"
          label="Cleanliness"
          value={summary.avg_rating_across_all.toFixed(1)}
        />
        <StatTile
          helper="Locations with a live coupon or perk"
          label="Offer Coverage"
          value={`${health.active_offer_coverage_percent}%`}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          helper="Weekly navigation launches"
          label="Route Starts"
          value={summary.total_weekly_navigation_count.toString()}
        />
        <StatTile
          helper="Favorites across claimed locations"
          label="Map Saves"
          value={summary.total_favorites_across_all.toString()}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile
          helper="Locations visible to free users"
          label="Visibility"
          value={`${health.visibility_coverage_percent}%`}
        />
        <StatTile
          helper="Monthly unique restroom viewers"
          label="Monthly Reach"
          value={summary.total_monthly_unique_visitors.toString()}
        />
      </View>

      <View className="mt-5 rounded-[24px] bg-surface-base px-4 py-4">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">What to do next</Text>
        <View className="mt-3 gap-3">
          {insights.map((insight) => (
            <View
              className={[
                'rounded-2xl border px-4 py-4',
                insight.tone === 'warning'
                  ? 'border-warning/20 bg-warning/10'
                  : insight.tone === 'positive'
                    ? 'border-success/20 bg-success/10'
                    : 'border-surface-strong bg-surface-card',
              ].join(' ')}
              key={insight.id}
            >
              <Text
                className={[
                  'text-sm font-bold',
                  insight.tone === 'warning'
                    ? 'text-warning'
                    : insight.tone === 'positive'
                      ? 'text-success'
                      : 'text-ink-900',
                ].join(' ')}
              >
                {insight.title}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">{insight.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export const DashboardStats = memo(DashboardStatsComponent);
