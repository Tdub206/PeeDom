import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MapDetailSheetCard } from '@/components/MapDetailSheetCard';
import { MapFilterDrawer } from '@/components/MapFilterDrawer';
import { BathroomMapView } from '@/components/MapView';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathrooms } from '@/hooks/useBathrooms';
import { useFavorites } from '@/hooks/useFavorites';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { BathroomListItem } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export default function MapTab() {
  const router = useRouter();
  const { showToast } = useToast();
  const { requireAuth } = useAuth();
  const filters = useFilterStore((state) => state.filters);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setMinCleanlinessRating = useFilterStore((state) => state.setMinCleanlinessRating);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const activeBathroomId = useMapStore((state) => state.activeBathroomId);
  const centerOnUser = useMapStore((state) => state.centerOnUser);
  const hasCenteredOnUser = useMapStore((state) => state.hasCenteredOnUser);
  const region = useMapStore((state) => state.region);
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);
  const {
    coordinates,
    error_message,
    is_refreshing,
    permission_status,
    requestPermission,
    refreshLocation,
  } = useLocation();
  const bathroomsQuery = useBathrooms({
    region,
    filters,
  });
  const bathrooms = bathroomsQuery.data?.items ?? [];
  const activeBathroom = useMemo(
    () => bathrooms.find((bathroom) => bathroom.id === activeBathroomId) ?? null,
    [activeBathroomId, bathrooms]
  );
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.isAccessible) {
      count += 1;
    }

    if (filters.isLocked) {
      count += 1;
    }

    if (filters.isCustomerOnly) {
      count += 1;
    }

    if (filters.openNow) {
      count += 1;
    }

    if (filters.noCodeRequired) {
      count += 1;
    }

    if (typeof filters.minCleanlinessRating === 'number') {
      count += 1;
    }

    return count;
  }, [
    filters.isAccessible,
    filters.isCustomerOnly,
    filters.isLocked,
    filters.minCleanlinessRating,
    filters.noCodeRequired,
    filters.openNow,
  ]);
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(bathrooms);

  useEffect(() => {
    if (coordinates && !hasCenteredOnUser) {
      centerOnUser();
    }
  }, [centerOnUser, coordinates, hasCenteredOnUser]);

  const handleLocateMe = useCallback(async () => {
    try {
      if (permission_status !== 'granted') {
        const granted = await requestPermission();

        if (granted) {
          centerOnUser();
        }

        return;
      }

      await refreshLocation();
      centerOnUser();
    } catch (error) {
      showToast({
        title: 'Location unavailable',
        message: getErrorMessage(error, 'We could not center the map on your device right now.'),
        variant: 'error',
      });
    }
  }, [centerOnUser, permission_status, refreshLocation, requestPermission, showToast]);

  const handleToggleFavorite = useCallback(
    async (bathroom: BathroomListItem) => {
      try {
        const outcome = await toggleFavorite(bathroom);

        if (outcome === 'completed') {
          void Haptics.selectionAsync().catch(() => undefined);
        }
      } catch (error) {
        // The hook already shows a user-facing error toast.
      }
    },
    [toggleFavorite]
  );

  const handleMarkerPress = useCallback((bathroomId: string) => {
    setActiveBathroomId(bathroomId);
    void Haptics.selectionAsync().catch(() => undefined);
  }, [setActiveBathroomId]);

  const handleOpenFilterDrawer = useCallback(() => {
    setActiveBathroomId(null);
    setIsFilterDrawerOpen(true);
  }, [setActiveBathroomId]);

  const handleCloseFilterDrawer = useCallback(() => {
    setIsFilterDrawerOpen(false);
  }, []);

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleFilter = useCallback(
    (filterKey: 'isAccessible' | 'isLocked' | 'isCustomerOnly' | 'openNow' | 'noCodeRequired') => {
      toggleFilter(filterKey);
    },
    [toggleFilter]
  );

  const handleSetMinCleanlinessRating = useCallback(
    (rating: number | null) => {
      setMinCleanlinessRating(rating);
    },
    [setMinCleanlinessRating]
  );

  const handleNavigateToBathroom = useCallback(
    async (bathroom: BathroomListItem) => {
      const encodedLabel = encodeURIComponent(bathroom.place_name);
      const latitude = bathroom.coordinates.latitude;
      const longitude = bathroom.coordinates.longitude;
      const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
      const googleNavigationUrl = `google.navigation:q=${latitude},${longitude}`;
      const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

      setIsOpeningDirections(true);

      try {
        if (Platform.OS === 'ios') {
          const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);

          if (canOpenAppleMaps) {
            await Linking.openURL(appleMapsUrl);
            return;
          }
        } else {
          const canOpenGoogleNavigation = await Linking.canOpenURL(googleNavigationUrl);

          if (canOpenGoogleNavigation) {
            await Linking.openURL(googleNavigationUrl);
            return;
          }
        }

        await Linking.openURL(browserFallbackUrl);
      } catch (error) {
        showToast({
          title: 'Navigation unavailable',
          message: getErrorMessage(error, 'We could not open navigation right now.'),
          variant: 'error',
        });
      } finally {
        setIsOpeningDirections(false);
      }
    },
    [showToast]
  );

  const handleOpenBathroomDetail = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    },
    [router]
  );

  const handleOpenReport = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.reportBathroom(bathroomId), routes.tabs.map);
    },
    [router]
  );

  const handleOpenAddBathroom = useCallback(() => {
    const authenticatedUser = requireAuth({
      type: 'add_bathroom',
      route: '/modal/add-bathroom',
      params: {},
      replay_strategy: 'draft_resume',
    });

    if (!authenticatedUser) {
      pushSafely(router, routes.auth.login, routes.auth.login);
      return;
    }

    pushSafely(router, routes.modal.addBathroom, routes.tabs.map);
  }, [requireAuth, router]);

  if (bathroomsQuery.isLoading && !bathrooms.length) {
    return <LoadingScreen message="Finding bathrooms around the current map region." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-4 pb-4 pt-3">
        <View className="rounded-[30px] bg-brand-600 px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Map</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-white">Bathrooms nearby.</Text>
          <Text className="mt-2 text-sm leading-6 text-white/85">
            Browse crowd-sourced bathroom locations, then tap a pin to inspect its latest access summary.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 self-start rounded-full bg-white/15 px-4 py-2"
            onPress={() => router.push(routes.tabs.search)}
          >
            <Text className="text-sm font-semibold text-white">Open search</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="mt-3 self-start rounded-full border border-white/20 bg-white px-4 py-2"
            onPress={handleOpenAddBathroom}
          >
            <Text className="text-sm font-semibold text-brand-700">Add a spot</Text>
          </Pressable>
        </View>

        {error_message ? (
          <View className="mt-4 rounded-3xl border border-warning/20 bg-warning/10 px-4 py-4">
            <Text className="text-sm font-semibold text-warning">Location note</Text>
            <Text className="mt-1 text-sm leading-5 text-warning">{error_message}</Text>
          </View>
        ) : null}

        {bathroomsQuery.error ? (
          <View className="mt-4 rounded-3xl border border-danger/20 bg-danger/10 px-4 py-4">
            <Text className="text-sm font-semibold text-danger">Map data unavailable</Text>
            <Text className="mt-1 text-sm leading-5 text-danger">
              {getErrorMessage(bathroomsQuery.error, 'We could not load nearby bathrooms right now.')}
            </Text>
          </View>
        ) : null}

        {bathroomsQuery.isFetching && bathrooms.length > 0 ? (
          <View className="mt-4 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-4">
            <Text className="text-sm font-semibold text-brand-700">Refreshing bathrooms</Text>
            <Text className="mt-1 text-sm leading-5 text-brand-700">
              Updating the current map region without interrupting your existing pins.
            </Text>
          </View>
        ) : null}

        <View className="mt-4 flex-1">
          <BathroomMapView
            activeFilterCount={activeFilterCount}
            bathrooms={bathrooms}
            isRefreshingLocation={is_refreshing}
            onFilterPress={handleOpenFilterDrawer}
            onLocateMe={() => {
              void handleLocateMe();
            }}
            onMarkerPress={handleMarkerPress}
            onRegionChangeComplete={setRegion}
            region={region}
            selectedBathroomId={activeBathroomId}
            userLocation={coordinates}
          />

          <BottomSheet isOpen={Boolean(activeBathroom)} onClose={() => setActiveBathroomId(null)} snapPoints={['44%', '76%']}>
            <View className="flex-1 px-4 pb-6 pt-2">
              {activeBathroom ? (
                <MapDetailSheetCard
                  bathroom={activeBathroom}
                  isFavorited={isFavorite(activeBathroom.id)}
                  isFavoritePending={isFavoritePending(activeBathroom.id)}
                  isNavigating={isOpeningDirections}
                  onNavigate={() => {
                    void handleNavigateToBathroom(activeBathroom);
                  }}
                  onOpenDetail={() => handleOpenBathroomDetail(activeBathroom.id)}
                  onReport={() => handleOpenReport(activeBathroom.id)}
                  onToggleFavorite={() => {
                    void handleToggleFavorite(activeBathroom);
                  }}
                />
              ) : null}
            </View>
          </BottomSheet>
        </View>
      </View>

      <MapFilterDrawer
        filters={filters}
        isOpen={isFilterDrawerOpen}
        onClose={handleCloseFilterDrawer}
        onReset={handleResetFilters}
        onSetMinCleanlinessRating={handleSetMinCleanlinessRating}
        onToggleFilter={handleToggleFilter}
      />
    </SafeAreaView>
  );
}
