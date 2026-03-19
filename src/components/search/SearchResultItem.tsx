import { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { BathroomListItem } from '@/types';
import { getBathroomMapPinTone, isBathroomOpenNow } from '@/utils/bathroom';

interface SearchResultItemProps {
  item: BathroomListItem;
  isFavorited: boolean;
  isFavoritePending: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

type SearchResultTone = ReturnType<typeof getBathroomMapPinTone>;

const TONE_COPY: Record<
  SearchResultTone,
  {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    dotColor: string;
  }
> = {
  open_unlocked: {
    icon: 'checkmark-circle',
    label: 'Open and unlocked',
    dotColor: colors.success,
  },
  locked_with_code: {
    icon: 'key-outline',
    label: 'Locked with code',
    dotColor: colors.warning,
  },
  locked_without_code: {
    icon: 'lock-closed-outline',
    label: 'Locked, no code yet',
    dotColor: colors.danger,
  },
  unknown_hours: {
    icon: 'time-outline',
    label: 'Hours need review',
    dotColor: colors.ink[400],
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

function SearchResultItemComponent({
  item,
  isFavorited,
  isFavoritePending,
  onPress,
  onToggleFavorite,
}: SearchResultItemProps) {
  const tone = getBathroomMapPinTone(item);
  const toneCopy = TONE_COPY[tone];
  const openNow = isBathroomOpenNow(item.hours);
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

          <Text className="mt-3 text-xl font-black text-ink-900">{item.place_name}</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">{item.address}</Text>
        </View>

        <Pressable
          accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
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
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {tags.map((tag) => (
          <View className="rounded-full bg-surface-muted px-3 py-1.5" key={tag}>
            <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-ink-600">{tag}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row items-center gap-3 rounded-[22px] bg-surface-base px-4 py-4">
        <View
          className="h-10 w-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${toneCopy.dotColor}15`,
          }}
        >
          <Ionicons color={toneCopy.dotColor} name={toneCopy.icon} size={18} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-black text-ink-900">Jump to this bathroom on the map</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-600">
            Center the map, open the sheet, and inspect the latest access details.
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const SearchResultItem = memo(SearchResultItemComponent);
