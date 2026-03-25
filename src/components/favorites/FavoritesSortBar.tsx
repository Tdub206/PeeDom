import { Pressable, Text, View } from 'react-native';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import type { FavoritesSortOption } from '@/types';

interface FavoritesSortBarProps {
  hasLocation: boolean;
  onSortChange: (sortBy: FavoritesSortOption) => void;
}

const SORT_OPTIONS: Array<{
  value: FavoritesSortOption;
  label: string;
}> = [
  {
    value: 'date_added',
    label: 'Recent',
  },
  {
    value: 'distance',
    label: 'Nearest',
  },
  {
    value: 'name',
    label: 'A-Z',
  },
];

export function FavoritesSortBar({ hasLocation, onSortChange }: FavoritesSortBarProps) {
  const sortBy = useFavoritesStore((state) => state.sortBy);

  return (
    <View className="mt-4 flex-row flex-wrap gap-3">
      {SORT_OPTIONS.map((option) => {
        const isActive = option.value === sortBy;
        const isDisabled = option.value === 'distance' && !hasLocation;

        return (
          <Pressable
            accessibilityLabel={
              isDisabled ? `${option.label} sorting requires location` : `Sort favorites by ${option.label}`
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, selected: isActive }}
            className={[
              'rounded-full border px-4 py-2',
              isActive ? 'border-brand-600 bg-brand-600' : 'border-surface-strong bg-surface-card',
              isDisabled ? 'opacity-50' : '',
            ].join(' ')}
            disabled={isDisabled}
            key={option.value}
            onPress={() => onSortChange(option.value)}
          >
            <Text
              className={[
                'text-xs font-semibold uppercase tracking-[0.75px]',
                isActive ? 'text-white' : 'text-ink-700',
              ].join(' ')}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
