import { memo } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { BathroomListItem } from '@/types';
import { SearchResultItem } from '@/components/search/SearchResultItem';
import { colors } from '@/constants/colors';

interface SearchResultsListProps {
  bathrooms: BathroomListItem[];
  isLoading: boolean;
  query: string;
  error: Error | null;
  isFavorite: (bathroomId: string) => boolean;
  isFavoritePending: (bathroomId: string) => boolean;
  onSelect: (bathroom: BathroomListItem) => void;
  onToggleFavorite: (bathroom: BathroomListItem) => void;
}

function SearchResultsListComponent({
  bathrooms,
  isLoading,
  query,
  error,
  isFavorite,
  isFavoritePending,
  onSelect,
  onToggleFavorite,
}: SearchResultsListProps) {
  if (isLoading && !bathrooms.length) {
    return (
      <View className="mt-4 flex-1 items-center justify-center rounded-[28px] border border-surface-strong bg-surface-card px-5 py-8">
        <ActivityIndicator color={colors.brand[600]} size="large" />
        <Text className="mt-4 text-base font-semibold text-ink-700">Searching bathrooms</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-500">
          Pulling the best matches for your current query and active filters.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="mt-4 rounded-[28px] border border-danger/20 bg-danger/10 px-5 py-6">
        <Text className="text-lg font-bold text-danger">Search unavailable</Text>
        <Text className="mt-2 text-sm leading-6 text-danger">{error.message}</Text>
      </View>
    );
  }

  if (!isLoading && !bathrooms.length) {
    return (
      <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
        <Text className="text-lg font-bold text-ink-900">No bathrooms matched.</Text>
        <Text className="mt-2 text-sm leading-6 text-ink-600">
          {query.trim().length >= 2
            ? 'Try a broader search term or clear one of the active filters to widen the results.'
            : 'Turn off a filter or start typing a place name, address, or postal code.'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 8 }}
      data={bathrooms}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <SearchResultItem
          isFavorited={isFavorite(item.id)}
          isFavoritePending={isFavoritePending(item.id)}
          item={item}
          onPress={() => onSelect(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
        />
      )}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        isLoading && bathrooms.length > 0 ? (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.brand[600]} size="small" />
            <Text className="mt-2 text-sm font-medium text-ink-600">Refreshing the latest matches</Text>
          </View>
        ) : null
      }
    />
  );
}

export const SearchResultsList = memo(SearchResultsListComponent);
