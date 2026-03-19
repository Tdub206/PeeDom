import { Text, View } from 'react-native';

interface FavoritesListHeaderProps {
  count: number;
}

export function FavoritesListHeader({ count }: FavoritesListHeaderProps) {
  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Saved bathrooms</Text>
      <Text className="mt-2 text-lg font-bold text-ink-900">
        {count} {count === 1 ? 'favorite' : 'favorites'} ready
      </Text>
      <Text className="mt-2 text-sm leading-6 text-ink-600">
        Tap a saved bathroom to center the map and reopen its detail sheet. Use the heart to remove it from this list.
      </Text>
    </View>
  );
}
