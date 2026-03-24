import React, { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { CodeBadge } from '@/components/CodeBadge';
import { colors } from '@/constants/colors';
import { BathroomListItem } from '@/types';
import { buildAccessibilityFeatureLabels, buildBathroomAccessibilityLabel } from '@/utils/accessibility';
import { VerificationBadge } from '@/components/business/VerificationBadge';
import { getBathroomMapPinTone, isBathroomOpenNow } from '@/utils/bathroom';

interface MapDetailSheetCardProps {
  bathroom: BathroomListItem;
  isFavorited: boolean;
  isFavoritePending: boolean;
  isNavigating: boolean;
  onNavigate: () => void;
  onOpenDetail: () => void;
  onReport: () => void;
  onToggleFavorite: () => void;
}

type StatusTone = ReturnType<typeof getBathroomMapPinTone>;

const STATUS_COPY: Record<
  StatusTone,
  {
    label: string;
    backgroundClassName: string;
    textClassName: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  open_unlocked: {
    label: 'Open and unlocked',
    backgroundClassName: 'bg-success/10',
    textClassName: 'text-success',
    icon: 'checkmark-circle',
  },
  locked_with_code: {
    label: 'Locked with code',
    backgroundClassName: 'bg-warning/10',
    textClassName: 'text-warning',
    icon: 'key-outline',
  },
  locked_without_code: {
    label: 'Locked, no code yet',
    backgroundClassName: 'bg-danger/10',
    textClassName: 'text-danger',
    icon: 'alert-circle',
  },
  unknown_hours: {
    label: 'Hours need review',
    backgroundClassName: 'bg-surface-muted',
    textClassName: 'text-ink-700',
    icon: 'time-outline',
  },
};

function formatDistance(distanceMeters?: number): string {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return 'Distance unavailable';
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

const AVG_WALK_SPEED_M_PER_MIN = 80;

function formatWalkTime(distanceMeters?: number): string | null {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  const minutes = Math.ceil(distanceMeters / AVG_WALK_SPEED_M_PER_MIN);

  if (minutes <= 1) {
    return '~1 min walk';
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `~${hours}h ${remaining}m walk` : `~${hours}h walk`;
  }

  return `~${minutes} min walk`;
}

function formatCleanliness(cleanlinessAverage: number | null): string {
  if (typeof cleanlinessAverage !== 'number') {
    return 'No cleanliness ratings yet';
  }

  return `${cleanlinessAverage.toFixed(1)} / 5 cleanliness`;
}

function formatHoursLabel(bathroom: BathroomListItem): string {
  const openNow = isBathroomOpenNow(bathroom.hours);

  if (openNow === true) {
    return 'Open now according to posted hours';
  }

  if (openNow === false) {
    return 'Closed right now according to posted hours';
  }

  return 'Hours unavailable';
}

function MapDetailSheetCardComponent({
  bathroom,
  isFavorited,
  isFavoritePending,
  isNavigating,
  onNavigate,
  onOpenDetail,
  onReport,
  onToggleFavorite,
}: MapDetailSheetCardProps) {
  const statusTone = getBathroomMapPinTone(bathroom);
  const statusCopy = STATUS_COPY[statusTone];
  const metadataChips = useMemo(() => {
    const chips: string[] = [];

    if (bathroom.flags.is_accessible) {
      chips.push('Accessible');
    }

    if (bathroom.flags.is_customer_only) {
      chips.push('Customers only');
    }

    if (bathroom.flags.is_locked) {
      chips.push('Locked entry');
    } else {
      chips.push('Walk-in access');
    }

    return [...chips, ...buildAccessibilityFeatureLabels(bathroom.accessibility_features, 3)];
  }, [bathroom.accessibility_features, bathroom.flags.is_accessible, bathroom.flags.is_customer_only, bathroom.flags.is_locked]);

  return (
    <View
      accessible
      accessibilityLabel={buildBathroomAccessibilityLabel(bathroom)}
      className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5"
    >
      <View className="flex-row items-start gap-4">
        <View className="flex-1">
          <View className={['self-start rounded-full px-3 py-1.5', statusCopy.backgroundClassName].join(' ')}>
            <View className="flex-row items-center gap-2">
              <Ionicons color={statusTone === 'unknown_hours' ? colors.ink[700] : colors[statusTone === 'open_unlocked' ? 'success' : statusTone === 'locked_with_code' ? 'warning' : 'danger']} name={statusCopy.icon} size={14} />
              <Text className={['text-xs font-black uppercase tracking-[0.8px]', statusCopy.textClassName].join(' ')}>
                {statusCopy.label}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <Text className="flex-1 text-2xl font-black text-ink-900">{bathroom.place_name}</Text>
            {bathroom.verification_badge_type ? (
              <VerificationBadge badgeType={bathroom.verification_badge_type} />
            ) : null}
          </View>
          <Text className="mt-2 text-sm leading-6 text-ink-600">{bathroom.address}</Text>
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-brand-700">{formatDistance(bathroom.distance_meters)}</Text>
            {formatWalkTime(bathroom.distance_meters) ? (
              <>
                <Text className="text-sm text-ink-400">·</Text>
                <Ionicons color={colors.brand[600]} name="walk-outline" size={14} />
                <Text className="text-sm font-bold text-brand-700">{formatWalkTime(bathroom.distance_meters)}</Text>
              </>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityLabel={isFavorited ? 'Remove bathroom from favorites' : 'Save bathroom to favorites'}
          accessibilityHint="Adds this bathroom to your saved list."
          accessibilityRole="button"
          accessibilityState={{ busy: isFavoritePending }}
          className={[
            'h-12 w-12 items-center justify-center rounded-full border',
            isFavorited ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
            isFavoritePending ? 'opacity-60' : '',
          ].join(' ')}
          disabled={isFavoritePending}
          onPress={onToggleFavorite}
        >
          <Ionicons
            color={isFavorited ? colors.brand[600] : colors.ink[500]}
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
          />
        </Pressable>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {metadataChips.map((chip) => (
          <View className="rounded-full bg-surface-muted px-3 py-1.5" key={chip}>
            <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-ink-600">{chip}</Text>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-[24px] bg-surface-base px-4 py-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Live access pulse</Text>
            <Text className="mt-1 text-base font-bold text-ink-900">{formatHoursLabel(bathroom)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Community</Text>
            <Text className="mt-1 text-sm font-bold text-ink-900">{formatCleanliness(bathroom.cleanliness_avg)}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4">
        <CodeBadge
          confidenceScore={bathroom.primary_code_summary.confidence_score}
          hasCode={bathroom.primary_code_summary.has_code}
          lastVerifiedAt={bathroom.primary_code_summary.last_verified_at}
        />
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          accessibilityLabel="Open navigation to this bathroom"
          accessibilityHint="Launches turn-by-turn navigation in your maps app."
          accessibilityRole="button"
          className="flex-1 rounded-[22px] border border-surface-strong bg-surface-base px-4 py-4"
          disabled={isNavigating}
          onPress={onNavigate}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
              <Ionicons color={colors.brand[600]} name="navigate" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-ink-900">{isNavigating ? 'Opening maps' : 'Navigate here'}</Text>
              <Text className="mt-1 text-xs leading-5 text-ink-600">Jump into Apple Maps or Google navigation.</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityLabel="Report this bathroom"
          accessibilityHint="Opens the issue report flow for this bathroom."
          accessibilityRole="button"
          className="flex-1 rounded-[22px] border border-surface-strong bg-surface-base px-4 py-4"
          onPress={onReport}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-danger/10">
              <Ionicons color={colors.danger} name="flag-outline" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-ink-900">Report issue</Text>
              <Text className="mt-1 text-xs leading-5 text-ink-600">Flag wrong codes, closures, or unsafe access.</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <Button
        className="mt-5"
        label="Open details and verify"
        accessibilityHint="Opens the full bathroom detail screen with code verification and accessibility details."
        onPress={onOpenDetail}
      />
    </View>
  );
}

export const MapDetailSheetCard = memo(MapDetailSheetCardComponent);
