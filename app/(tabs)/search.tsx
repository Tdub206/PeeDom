import { useCallback, useEffect, useMemo } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CityBrowse, RecentSearches, SearchBar, SearchFilters, SearchResultsList } from '@/components/search';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useAccessibilityPreferences } from '@/hooks/useAccessibility';
import { useGeocodeFallback } from '@/hooks/useGeocodeFallback';
import { useGoogleAddressAutocomplete } from '@/hooks/useGooglePlaces';
import { PlacesAutocompleteDropdown } from '@/components/places/PlacesAutocompleteDropdown';
import { useSearch, useSearchSuggestions } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useRecordVisit } from '@/hooks/useStallPassVisits';
import { pushSafely } from '@/lib/navigation';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { useSearchStore } from '@/store/useSearchStore';
import { useToast } from '@/hooks/useToast';
import { BathroomListItem, GooglePlaceAutocompleteSuggestion } from '@/types';
import { getCanonicalBathroomId, mergeAccessibilityFilters } from '@/utils/bathroom';
import { buildRegionFromGoogleViewport } from '@/utils/google-places';
import { formatSearchDistance } from '@/utils/search';

export default function SearchTab() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const filters = useFilterStore((state) => state.filters);
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const resolvedFilters = useMemo(
    () => mergeAccessibilityFilters(filters, isAccessibilityMode, accessibilityPreferences),
    [accessibilityPreferences, filters, isAccessibilityMode]
  );
  const activeQuery = useSearchStore((state) => state.activeQuery);
  const committedQuery = useSearchStore((state) => state.committedQuery);
  const phase = useSearchStore((state) => state.phase);
  const setActiveQuery = useSearchStore((state) => state.setActiveQuery);
  const commitQuery = useSearchStore((state) => state.commitQuery);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const setPhase = useSearchStore((state) => state.setPhase);
  const clearSearchTarget = useMapStore((state) => state.clearSearchTarget);
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const setSearchTarget = useMapStore((state) => state.setSearchTarget);
  const userLocation = useMapStore((state) => state.userLocation);
  const {
    addToHistory,
    clearHistory,
    error: historyError,
    history,
    isLoading: isLoadingHistory,
    removeFromHistory,
  } = useSearchHistory();
  const searchResults = useSearch({
    filters: resolvedFilters,
    origin: userLocation,
    onSearchResolved: async (query, resultCount) => {
      await addToHistory(query, resultCount);
    },
  });
  const suggestionsQuery = useSearchSuggestions(userLocation);
  const {
    suggestions: googleSuggestions,
    isLoading: isGoogleAutocompleteLoading,
    error: googleAutocompleteError,
    resetSession: resetGoogleAutocompleteSession,
    resolveSelection: resolveGoogleAddressSelection,
  } = useGoogleAddressAutocomplete({
    query: activeQuery,
    origin: userLocation,
  });
  const { geocoded } = useGeocodeFallback(committedQuery);
  useAccessibilityPreferences();
  const bathrooms = searchResults.items;
  const suggestions = suggestionsQuery.data ?? [];
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(bathrooms);
  const recordVisitMutation = useRecordVisit();

  useEffect(() => {
    const trimmedActiveQuery = activeQuery.trim();
    const trimmedCommittedQuery = committedQuery.trim();
    const isTypingAhead = trimmedActiveQuery.length >= 2 && trimmedActiveQuery !== trimmedCommittedQuery;

    if (!trimmedActiveQuery && !trimmedCommittedQuery && !searchResults.isSearchReady) {
      setPhase('idle');
      return;
    }

    if (searchResults.error) {
      setPhase('error');
      return;
    }

    if (searchResults.isLoading && searchResults.isSearchReady && bathrooms.length === 0) {
      setPhase('searching');
      return;
    }

    if (isTypingAhead) {
      setPhase(suggestions.length > 0 ? 'suggesting' : 'typing');
      return;
    }

    if (bathrooms.length > 0) {
      setPhase('results');
      return;
    }

    if (searchResults.isSearchReady && !searchResults.isLoading) {
      setPhase('empty');
      return;
    }

    setPhase('idle');
  }, [
    activeQuery,
    bathrooms.length,
    committedQuery,
    searchResults.error,
    searchResults.isLoading,
    searchResults.isSearchReady,
    setPhase,
    suggestions.length,
  ]);

  const handleClearSearch = useCallback(() => {
    clearQuery();
    resetGoogleAutocompleteSession();
  }, [clearQuery, resetGoogleAutocompleteSession]);

  const handleSubmitSearch = useCallback(() => {
    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    resetGoogleAutocompleteSession();
    commitQuery(trimmedQuery);
    Keyboard.dismiss();
  }, [activeQuery, commitQuery, resetGoogleAutocompleteSession]);

  const handleSelectBathroom = useCallback(
    (bathroom: BathroomListItem) => {
      const canonicalBathroomId = getCanonicalBathroomId(bathroom);

      if (user?.id && canonicalBathroomId) {
        recordVisitMutation.mutate({
          bathroomId: canonicalBathroomId,
          source: 'search',
        });
      }

      Keyboard.dismiss();
      clearSearchTarget();
      setRegion({
        latitude: bathroom.coordinates.latitude,
        longitude: bathroom.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setActiveBathroomId(bathroom.id);
      pushSafely(router, routes.tabs.map, routes.tabs.search);
    },
    [clearSearchTarget, recordVisitMutation, router, setActiveBathroomId, setRegion, user?.id]
  );

  const handleToggleFavorite = useCallback(
    async (bathroom: BathroomListItem) => {
      if (bathroom.can_favorite === false) {
        return;
      }

      try {
        await toggleFavorite(bathroom);
      } catch (error) {
        // useFavorites already shows the user-facing failure state.
      }
    },
    [toggleFavorite]
  );

  const handleSelectHistory = useCallback(
    (query: string) => {
      setActiveQuery(query);
      resetGoogleAutocompleteSession();
      clearSearchTarget();
      commitQuery(query);
      Keyboard.dismiss();
    },
    [clearSearchTarget, commitQuery, resetGoogleAutocompleteSession, setActiveQuery]
  );

  const handleSelectCity = useCallback(
    (city: string, state: string) => {
      const nextQuery = `${city}, ${state}`;
      setActiveQuery(nextQuery);
      resetGoogleAutocompleteSession();
      clearSearchTarget();
      commitQuery(nextQuery);
      Keyboard.dismiss();
    },
    [clearSearchTarget, commitQuery, resetGoogleAutocompleteSession, setActiveQuery]
  );

  const handleSelectSuggestion = useCallback(
    (query: string) => {
      setActiveQuery(query);
      resetGoogleAutocompleteSession();
      clearSearchTarget();
      commitQuery(query);
      Keyboard.dismiss();
    },
    [clearSearchTarget, commitQuery, resetGoogleAutocompleteSession, setActiveQuery]
  );

  const handleJumpToLocation = useCallback(
    (
      coordinates: { latitude: number; longitude: number },
      options: {
        label: string;
        address?: string | null;
        placeId?: string | null;
        region?: {
          latitude: number;
          longitude: number;
          latitudeDelta: number;
          longitudeDelta: number;
        } | null;
        source: 'google_maps_address' | 'device_geocoder';
      }
    ) => {
      Keyboard.dismiss();
      clearSearchTarget();
      setActiveBathroomId(null);
      setSearchTarget({
        label: options.label,
        address: options.address ?? null,
        coordinates,
        source: options.source,
        place_id: options.placeId ?? null,
      });
      setRegion(
        options.region ?? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      );
      pushSafely(router, routes.tabs.map, routes.tabs.search);
    },
    [clearSearchTarget, router, setActiveBathroomId, setRegion, setSearchTarget]
  );

  const handleJumpToGeocodedLocation = useCallback(() => {
    if (!geocoded) {
      return;
    }

    handleJumpToLocation(geocoded.coordinates, {
      label: geocoded.name,
      address: null,
      placeId: null,
      region: null,
      source: 'device_geocoder',
    });
  }, [geocoded, handleJumpToLocation]);

  const handleSelectGoogleSuggestion = useCallback(
    async (suggestion: GooglePlaceAutocompleteSuggestion) => {
      try {
        const selection = await resolveGoogleAddressSelection(suggestion);

        setActiveQuery(suggestion.text);
        commitQuery(suggestion.text);
        handleJumpToLocation(selection.location, {
          label: suggestion.text,
          address: selection.formatted_address ?? suggestion.secondary_text,
          placeId: selection.place_id,
          region: buildRegionFromGoogleViewport(selection.viewport, selection.location),
          source: 'google_maps_address',
        });
      } catch (error) {
        showToast({
          title: 'Address unavailable',
          message: error instanceof Error ? error.message : 'Unable to load that address right now.',
          variant: 'error',
        });
      }
    },
    [commitQuery, handleJumpToLocation, resolveGoogleAddressSelection, setActiveQuery, showToast]
  );

  const showIdleState = phase === 'idle';
  const isTypingPhase = phase === 'typing' || phase === 'suggesting';
  const showGoogleDropdown =
    isTypingPhase &&
    (googleSuggestions.length > 0 || isGoogleAutocompleteLoading || Boolean(googleAutocompleteError));
  const showSuggestions = isTypingPhase && (suggestions.length > 0 || showGoogleDropdown);
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
              Search by name, address, or city, then jump straight back to the map with the selected bathroom centered.
            </Text>
          </View>

          <View className="mt-4">
            <SearchBar
              isLoading={searchResults.isLoading || searchResults.isFetching || isGoogleAutocompleteLoading}
              onChangeText={setActiveQuery}
              onClear={handleClearSearch}
              onSubmitEditing={handleSubmitSearch}
              value={activeQuery}
            />
            <SearchFilters />
          </View>

          {showSuggestions ? (
            <ScrollView
              className="mt-4 flex-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {suggestions.length > 0 ? (
                <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">StallPass listings</Text>
                  <View className="mt-4 gap-3">
                    {suggestions.map((suggestion) => (
                      <Pressable
                        accessibilityLabel={`Search suggestion ${suggestion.place_name}`}
                        accessibilityRole="button"
                        className="rounded-2xl bg-surface-base px-4 py-4"
                        key={suggestion.bathroom_id}
                        onPress={() => handleSelectSuggestion(suggestion.place_name)}
                      >
                        <Text className="text-base font-semibold text-ink-900">
                          {suggestion.place_name}
                          {suggestion.city ? `, ${suggestion.city}` : ''}
                          {suggestion.state ? `, ${suggestion.state}` : ''}
                        </Text>
                        {formatSearchDistance(suggestion.distance_meters) ? (
                          <Text className="mt-1 text-sm text-ink-600">
                            {formatSearchDistance(suggestion.distance_meters)}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <PlacesAutocompleteDropdown
                suggestions={googleSuggestions}
                isLoading={isGoogleAutocompleteLoading}
                error={googleAutocompleteError}
                visible={showGoogleDropdown}
                variant="search"
                showDistance
                onSelect={(suggestion) => {
                  void handleSelectGoogleSuggestion(suggestion);
                }}
              />
            </ScrollView>
          ) : null}

          {!showSuggestions && showIdleState ? (
            <ScrollView className="mt-4 flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
                <Text className="text-lg font-bold text-ink-900">Start with a place, address, or city.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Recent searches stay handy here, and city browse gives you a quick way to explore dense bathroom coverage.
                </Text>
              </View>

              {historyError ? (
                <View className="mt-4 rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
                  <Text className="text-sm font-semibold text-warning">Recent searches unavailable</Text>
                  <Text className="mt-2 text-sm leading-6 text-warning">{historyError.message}</Text>
                </View>
              ) : null}

              {!isLoadingHistory ? (
                <RecentSearches
                  history={history}
                  onClear={() => {
                    void clearHistory();
                  }}
                  onRemove={(query) => {
                    void removeFromHistory(query);
                  }}
                  onSelect={handleSelectHistory}
                />
              ) : null}

              <CityBrowse onSelect={handleSelectCity} />
            </ScrollView>
          ) : null}

          {!showSuggestions && !showIdleState ? (
            <>
              <SearchResultsList
                bathrooms={bathrooms}
                error={searchResults.error}
                hasNextPage={Boolean(searchResults.hasNextPage)}
                isFavorite={isFavorite}
                isFavoritePending={isFavoritePending}
                isFetchingNextPage={searchResults.isFetchingNextPage}
                isLoading={searchResults.isLoading || searchResults.isFetching}
                onEndReached={() => {
                  if (searchResults.hasNextPage && !searchResults.isFetchingNextPage) {
                    void searchResults.fetchNextPage();
                  }
                }}
                onSelect={handleSelectBathroom}
                onToggleFavorite={(bathroom) => {
                  void handleToggleFavorite(bathroom);
                }}
                query={committedQuery}
              />
              {bathrooms.length === 0 &&
                !searchResults.isLoading &&
                !searchResults.isFetching &&
                geocoded ? (
                <Pressable
                  accessibilityLabel={`View ${geocoded.name} on the map`}
                  accessibilityRole="button"
                  className="mt-4 flex-row items-center gap-3 rounded-[28px] border border-brand-200 bg-brand-50 px-5 py-5"
                  onPress={handleJumpToGeocodedLocation}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-600">
                    <Ionicons color="#fff" name="map-outline" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-brand-700">
                      Jump to {geocoded.name}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-brand-600">
                      No bathrooms listed yet - be the first to add one!
                    </Text>
                  </View>
                  <Ionicons color={colors.brand[600]} name="chevron-forward" size={20} />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
