import { useCallback } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BathroomCard } from '@/components/BathroomCard';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useFavorites } from '@/hooks/useFavorites';
import { useSearch } from '@/hooks/useSearch';
import { useMapStore } from '@/store/useMapStore';
import { useFilterStore } from '@/store/useFilterStore';
import { BathroomListItem } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const FILTER_OPTIONS: Array<{ key: 'isAccessible' | 'isLocked' | 'isCustomerOnly'; label: string }> = [
  { key: 'isAccessible', label: 'Accessible' },
  { key: 'isLocked', label: 'Locked' },
  { key: 'isCustomerOnly', label: 'Customers only' },
];

const SEARCH_ITEM_HEIGHT = 250;

export default function SearchTab() {
  const router = useRouter();
  const filters = useFilterStore((state) => state.filters);
  const searchQuery = useFilterStore((state) => state.searchQuery);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setSearchQuery = useFilterStore((state) => state.setSearchQuery);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const userLocation = useMapStore((state) => state.userLocation);
  const searchResults = useSearch({
    query: searchQuery,
    filters,
    origin: userLocation,
  });
  const bathrooms = searchResults.data?.items ?? [];
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(bathrooms);

  const handleToggleFavorite = useCallback(
    async (bathroom: BathroomListItem) => {
      try {
        await toggleFavorite(bathroom);
      } catch (error) {
        // The hook already surfaces the user-facing failure state.
      }
    },
    [toggleFavorite]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View className="flex-1 px-4 pb-4 pt-3">
          <View className="rounded-[30px] bg-ink-900 px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Search</Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-white">Find the right stop.</Text>
            <Text className="mt-2 text-sm leading-6 text-white/80">
              Search by name, address, or postal code, then save dependable bathrooms to your account.
            </Text>
          </View>

          <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card p-5">
            <Input
              autoCapitalize="none"
              autoCorrect={false}
              label="Search bathrooms"
              onChangeText={setSearchQuery}
              placeholder="Coffee shop, station, neighborhood..."
              returnKeyType="search"
              value={searchQuery}
            />

            <View className="mt-4 flex-row flex-wrap gap-2">
              {FILTER_OPTIONS.map((filterOption) => {
                const isActive = Boolean(filters[filterOption.key]);

                return (
                  <Pressable
                    accessibilityRole="button"
                    className={[
                      'rounded-full border px-4 py-2',
                      isActive ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                    ].join(' ')}
                    key={filterOption.key}
                    onPress={() => toggleFilter(filterOption.key)}
                  >
                    <Text
                      className={[
                        'text-sm font-semibold',
                        isActive ? 'text-brand-700' : 'text-ink-700',
                      ].join(' ')}
                    >
                      {filterOption.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-surface-strong bg-surface-base px-4 py-2"
                onPress={resetFilters}
              >
                <Text className="text-sm font-semibold text-ink-600">Reset</Text>
              </Pressable>
            </View>
          </View>

          {!searchResults.isSearchReady ? (
            <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-lg font-bold text-ink-900">Start typing to search.</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                Enter at least two characters, or enable a filter to narrow the bathroom list immediately.
              </Text>
            </View>
          ) : searchResults.error ? (
            <View className="mt-4 rounded-[30px] border border-danger/20 bg-danger/10 px-5 py-6">
              <Text className="text-lg font-bold text-danger">Search unavailable</Text>
              <Text className="mt-2 text-sm leading-6 text-danger">
                {getErrorMessage(searchResults.error, 'We could not search bathrooms right now.')}
              </Text>
            </View>
          ) : bathrooms.length === 0 && !searchResults.isFetching ? (
            <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-lg font-bold text-ink-900">No bathrooms matched.</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                Try a broader search term or clear one of the active filters to widen the results.
              </Text>
            </View>
          ) : (
            <FlatList
              contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 8 }}
              data={bathrooms}
              getItemLayout={(_, index) => ({
                index,
                length: SEARCH_ITEM_HEIGHT,
                offset: SEARCH_ITEM_HEIGHT * index,
              })}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <BathroomCard
                  isFavorited={isFavorite(item.id)}
                  isFavoritePending={isFavoritePending(item.id)}
                  item={item}
                  onPress={() => router.push(routes.bathroomDetail(item.id))}
                  onToggleFavorite={() => {
                    void handleToggleFavorite(item);
                  }}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
