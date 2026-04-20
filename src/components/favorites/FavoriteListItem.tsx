import { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BathroomOriginBadge } from '@/components/BathroomOriginBadge';
import { CodeBadge } from '@/components/CodeBadge';
import { colors } from '@/constants/colors';
import { FavoriteItem } from '@/types';
import { getBathroomMapPinTone, getBathroomOriginBadgeLabel, isBathroomOpenNow } from '@/utils/bathroom';

interface FavoriteListItemProps {
  item: FavoriteItem;
  isPending: boolean;
  onPress: () => void;
  onRemove: () => void;
}

type FavoriteTone = ReturnType<typeof getBathroomMapPinTone>;

const TONE_COPY: Record<
  FavoriteTone,
  {
    dotColor: string;
    label: string;
  }
> = {
  open_unlocked: {
    dotColor: colors.success,
    label: 'Open and unlocked',
  },
  locked_with_code: {
    dotColor: colors.warning,
    label: 'Locked with code',
  },
  locked_without_code: {
    dotColor: colors.danger,
    label: 'Locked, no code yet',
  },
  unknown_hours: {
    dotColor: colors.ink[400],
    label: 'Hours need review',
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

function formatSavedDate(value: string): string | null {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return null;
  }

  return parsedValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function FavoriteListItemComponent({ item, isPending, onPress, onRemove }: FavoriteListItemProps) {
  const tone = getBathroomMapPinTone(item);
  const toneCopy = TONE_COPY[tone];
  const openNow = isBathroomOpenNow(item.hours);
  const savedDate = formatSavedDate(item.favorited_at);
  const originBadgeLabel = useMemo(() => getBathroomOriginBadgeLabel(item), [item]);
  const tags = useMemo(() => {
    const nextTags: string[] = [formatDistance(item.distance_meters)];

    if (item.flags.is_accessible) {
      nextTags.push('Accessible');
    }

    if (item.flags.is_customer_only) {
      nextTags.push('Customers only');
    }

    if (openNow === true) {
      nextTags.push('Open now');
    } else if (openNow === false) {
      nextTags.push('Closed');
    }

    return nextTags;
  }, [item.distance_meters, item.flags.is_accessible, item.flags.is_customer_only, openNow]);

  return (
    <Pressable
      accessibilityRole="button"
      className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5"
      onPress={onPress}
    >
      <View className="flex-row items-start gap-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-3">
            <View
              className="h-3.5 w-3.5 rounded-full"
              style={{
                backgroundColor: toneCopy.dotColor,
              }}
            />
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{toneCopy.label}</Text>
          </View>

          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <Text className="text-xl font-black text-ink-900">{item.place_name}</Text>
            {originBadgeLabel ? <BathroomOriginBadge label={originBadgeLabel} /> : null}
          </View>
          <Text className="mt-2 text-sm leading-6 text-ink-600">{item.address}</Text>
          {savedDate ? (
            <Text className="mt-3 text-xs font-semibold uppercase tracking-[0.75px] text-brand-700">
              Saved {savedDate}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Remove from favorites"
          accessibilityRole="button"
          accessibilityState={{ busy: isPending }}
          className={[
            'h-12 w-12 items-center justify-center rounded-full border border-brand-200 bg-brand-50',
            isPending ? 'opacity-60' : '',
          ].join(' ')}
          disabled={isPending}
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Ionicons color={colors.brand[600]} name="heart" size={20} />
        </Pressable>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {tags.map((tag) => (
          <View className="rounded-full bg-surface-muted px-3 py-1.5" key={tag}>
            <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-ink-600">{tag}</Text>
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

export const FavoriteListItem = memo(FavoriteListItemComponent);
