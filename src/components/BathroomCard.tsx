import React, { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { BathroomListItem, FavoriteItem } from '@/types';
import { CodeBadge } from '@/components/CodeBadge';
import { buildAccessibilityFeatureLabels, buildBathroomAccessibilityLabel } from '@/utils/accessibility';

interface BathroomCardProps {
  item: BathroomListItem | FavoriteItem;
  isFavorited: boolean;
  isFavoritePending?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

function formatDistance(distanceMeters?: number): string {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return 'Distance unavailable';
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

function BathroomCardComponent({
  item,
  isFavorited,
  isFavoritePending = false,
  onPress,
  onToggleFavorite,
}: BathroomCardProps) {
  const metadataChips = useMemo(() => {
    const chips: string[] = [];

    if (item.flags.is_accessible) {
      chips.push('Accessible');
    }

    if (item.flags.is_locked) {
      chips.push('Locked');
    }

    if (item.flags.is_customer_only) {
      chips.push('Customers only');
    }

    if (!chips.length) {
      chips.push('Public access');
    }

    return [...chips, ...buildAccessibilityFeatureLabels(item.accessibility_features, 2)];
  }, [item.accessibility_features, item.flags.is_accessible, item.flags.is_customer_only, item.flags.is_locked]);

  return (
    <Pressable
      accessibilityHint="Opens the bathroom detail screen."
      accessibilityLabel={buildBathroomAccessibilityLabel(item)}
      accessibilityRole="button"
      className="rounded-[28px] border border-surface-strong bg-surface-card p-5"
      onPress={onPress}
    >
      <View className="flex-row items-start gap-4">
        <View className="flex-1">
          <Text className="text-xl font-black text-ink-900">{item.place_name}</Text>
          <Text className="mt-2 text-sm leading-5 text-ink-600">{item.address}</Text>
          <Text className="mt-3 text-sm font-medium text-brand-700">{formatDistance(item.distance_meters)}</Text>
        </View>

        {onToggleFavorite ? (
          <Pressable
            accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityHint="Saves this bathroom for faster access later."
            accessibilityRole="button"
            accessibilityState={{ busy: isFavoritePending }}
            className={[
              'h-12 w-12 items-center justify-center rounded-full border',
              isFavorited ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
              isFavoritePending ? 'opacity-60' : '',
            ].join(' ')}
            disabled={isFavoritePending}
            onPress={(event: GestureResponderEvent) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Ionicons
              color={isFavorited ? colors.brand[600] : colors.ink[500]}
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {metadataChips.map((chip) => (
          <View className="rounded-full bg-surface-muted px-3 py-1.5" key={chip}>
            <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-ink-600">{chip}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4">
        <CodeBadge
          confidenceScore={item.primary_code_summary.confidence_score}
          hasCode={item.primary_code_summary.has_code}
          lastVerifiedAt={item.primary_code_summary.last_verified_at}
        />
      </View>
    </Pressable>
  );
}

export const BathroomCard = memo(BathroomCardComponent);
