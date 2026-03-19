import { Text, View } from 'react-native';
import { Button } from '@/components/Button';

interface FavoritesEmptyStateProps {
  isGuest: boolean;
  onPrimaryAction: () => void;
}

export function FavoritesEmptyState({ isGuest, onPrimaryAction }: FavoritesEmptyStateProps) {
  return (
    <View className="rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
      <Text className="text-lg font-bold text-ink-900">
        {isGuest ? 'Sign in to save favorites.' : 'No favorites saved yet.'}
      </Text>
      <Text className="mt-2 text-sm leading-6 text-ink-600">
        {isGuest
          ? 'Guest mode lets you browse bathrooms, but saved favorites stay synced only for signed-in accounts.'
          : 'Add bathrooms from the map or search tab to keep them pinned here for quick access later.'}
      </Text>
      <Button
        className="mt-5"
        label={isGuest ? 'Sign In To Save Favorites' : 'Browse Search'}
        onPress={onPrimaryAction}
        variant={isGuest ? 'primary' : 'secondary'}
      />
    </View>
  );
}
