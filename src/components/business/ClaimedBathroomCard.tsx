import { memo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { VerificationBadge } from '@/components/business/VerificationBadge';
import type { BusinessDashboardBathroom } from '@/types';

interface ClaimedBathroomCardProps {
  bathroom: BusinessDashboardBathroom;
  onOpenBathroom: (bathroomId: string) => void;
  onManageHours: (bathroomId: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const timestamp = new Date(isoString).getTime();

  if (Number.isNaN(timestamp)) {
    return 'recently';
  }

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <View className="flex-1 rounded-2xl bg-surface-base px-3 py-3">
      <Text
        className={[
          'text-2xl font-black tracking-tight',
          tone === 'warning' ? 'text-danger' : 'text-ink-900',
        ].join(' ')}
      >
        {value}
      </Text>
      <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
    </View>
  );
}

function ClaimedBathroomCardComponent({
  bathroom,
  onOpenBathroom,
  onManageHours,
}: ClaimedBathroomCardProps) {
  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">
            {bathroom.business_name ?? 'Claimed location'}
          </Text>
          <Text className="mt-2 text-2xl font-black tracking-tight text-ink-900">{bathroom.place_name}</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            Last analytics refresh {formatRelativeTime(bathroom.last_updated)}
          </Text>
        </View>
        {bathroom.has_verification_badge ? (
          <VerificationBadge badgeType={bathroom.verification_badge_type} />
        ) : null}
      </View>

      {bathroom.has_active_featured_placement ? (
        <View className="mt-4 self-start rounded-full bg-warning/15 px-3 py-2">
          <Text className="text-xs font-black uppercase tracking-[1px] text-warning">
            {bathroom.active_featured_placements} active featured placement
            {bathroom.active_featured_placements === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <Metric label="Favorites" value={bathroom.total_favorites.toString()} />
        <Metric label="Cleanliness" value={bathroom.avg_cleanliness.toFixed(1)} />
      </View>

      <View className="mt-3 flex-row gap-3">
        <Metric
          label="Open Reports"
          tone={bathroom.open_reports > 0 ? 'warning' : 'default'}
          value={bathroom.open_reports.toString()}
        />
        <Metric label="Views" value={bathroom.weekly_views.toString()} />
      </View>

      <View className="mt-5 gap-3">
        <Button
          label="Manage Hours"
          onPress={() => onManageHours(bathroom.bathroom_id)}
        />
        <Button
          label="Open Bathroom"
          onPress={() => onOpenBathroom(bathroom.bathroom_id)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

export const ClaimedBathroomCard = memo(ClaimedBathroomCardComponent);
