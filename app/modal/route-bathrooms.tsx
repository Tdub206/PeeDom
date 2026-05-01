import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PlacesAutocompleteDropdown } from '@/components/places/PlacesAutocompleteDropdown';
import { recordBathroomNavigationOpen } from '@/api/bathrooms';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useGeocodeFallback } from '@/hooks/useGeocodeFallback';
import { useGoogleAddressAutocomplete } from '@/hooks/useGooglePlaces';
import { useLocation } from '@/hooks/useLocation';
import { useBathrooms } from '@/hooks/useBathrooms';
import { useRecordVisit } from '@/hooks/useStallPassVisits';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { BathroomListItem, Coordinates, GooglePlaceAutocompleteSuggestion, RegionBounds } from '@/types';
import { fetchRouteGeometry, type RouteGeometry } from '@/lib/route-geometry';
import { hasActivePremium } from '@/lib/gamification';
import {
  calculateDistanceMeters,
  getBathroomMapPinTone,
  getCanonicalBathroomId,
  isBathroomVisibleOnMap,
  mergeAccessibilityFilters,
} from '@/utils/bathroom';
import { pushSafely } from '@/lib/navigation';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/utils/errorMap';

const AVG_WALK_SPEED_M_PER_MIN = 80;
const ROUTE_CORRIDOR_BUFFER_M = 350;

interface RouteBathroomResult {
  bathroom: BathroomListItem;
  detourMeters: number;
  routeDistanceFromStartMeters: number;
  rankScore: number;
}

function pointToSegmentDistance(point: Coordinates, segStart: Coordinates, segEnd: Coordinates): number {
  const dx = segEnd.longitude - segStart.longitude;
  const dy = segEnd.latitude - segStart.latitude;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return calculateDistanceMeters(point, segStart);
  }

  let t =
    ((point.longitude - segStart.longitude) * dx +
      (point.latitude - segStart.latitude) * dy) /
    lenSq;
  t = Math.max(0, Math.min(1, t));

  const projection: Coordinates = {
    latitude: segStart.latitude + t * dy,
    longitude: segStart.longitude + t * dx,
  };

  return calculateDistanceMeters(point, projection);
}

function getClosestDistanceToPolyline(point: Coordinates, polyline: Coordinates[]): number {
  if (polyline.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = pointToSegmentDistance(point, polyline[index], polyline[index + 1]);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

function buildRouteRegion(routePoints: Coordinates[]): RegionBounds {
  const latitudes = routePoints.map((point) => point.latitude);
  const longitudes = routePoints.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(0.02, (maxLatitude - minLatitude) * 1.4),
    longitudeDelta: Math.max(0.02, (maxLongitude - minLongitude) * 1.4),
  };
}

function estimateRouteDistanceFromStart(routePoints: Coordinates[], point: Coordinates): number {
  if (routePoints.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let traveled = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestTravelDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const segmentStart = routePoints[index];
    const segmentEnd = routePoints[index + 1];
    const segmentLength = calculateDistanceMeters(segmentStart, segmentEnd);
    const distanceToSegment = pointToSegmentDistance(point, segmentStart, segmentEnd);

    if (distanceToSegment < bestDistance) {
      bestDistance = distanceToSegment;
      bestTravelDistance = traveled + segmentLength / 2;
    }

    traveled += segmentLength;
  }

  return bestTravelDistance;
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0 m';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatWalkTime(meters?: number): string {
  if (typeof meters !== 'number' || meters <= 0) {
    return '?';
  }

  const minutes = Math.ceil(meters / AVG_WALK_SPEED_M_PER_MIN);

  if (minutes <= 1) {
    return '~1 min';
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `~${hours}h ${remainingMinutes}m` : `~${hours}h`;
  }

  return `~${minutes} min`;
}

function getStatusLabel(bathroom: BathroomListItem): { label: string; color: string } {
  const tone = getBathroomMapPinTone(bathroom);

  switch (tone) {
    case 'open_unlocked':
      return { label: 'Open', color: colors.success };
    case 'locked_with_code':
      return { label: 'Code', color: colors.warning };
    case 'locked_without_code':
      return { label: 'Locked', color: colors.danger };
    default:
      return { label: 'Unknown', color: colors.ink[400] };
  }
}

function computeRouteBathroomRankScore(input: {
  bathroom: BathroomListItem;
  detourMeters: number;
  distanceFromStartMeters: number;
  isAccessibilityMode: boolean;
}): number {
  const statusTone = getBathroomMapPinTone(input.bathroom);

  const detourScore = Math.max(0, 40 - input.detourMeters / 45);
  const distanceScore = Math.max(0, 28 - input.distanceFromStartMeters / 220);
  const statusScore =
    statusTone === 'open_unlocked'
      ? 24
      : statusTone === 'locked_with_code'
        ? 13
        : statusTone === 'locked_without_code'
          ? 2
          : 8;
  const accessScore = input.bathroom.flags.is_locked === true ? -6 : 10;
  const confidenceScore = (input.bathroom.primary_code_summary.confidence_score ?? 45) * 0.22;
  const needProfileScore =
    input.isAccessibilityMode && (input.bathroom.flags.is_accessible || input.bathroom.accessibility_score >= 30)
      ? 14
      : 0;

  return detourScore + distanceScore + statusScore + accessScore + confidenceScore + needProfileScore;
}

export default function RouteBathroomsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile, user } = useAuth();
  const { coordinates: userLocation } = useLocation();
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string>('');
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const routeRequestIdRef = useRef(0);
  const isPremiumUser = hasActivePremium(profile);
  const recordVisitMutation = useRecordVisit();

  const {
    suggestions,
    isLoading: isLoadingDestinationSuggestions,
    error: destinationSuggestionError,
    resetSession: resetDestinationAutocompleteSession,
    resolveSelection: resolveDestinationSelection,
  } = useGoogleAddressAutocomplete({
    query: destinationQuery,
    origin: userLocation,
    enabled: true,
  });
  const { geocoded } = useGeocodeFallback(destinationQuery);

  const routeRegion = useMemo(() => {
    if (!userLocation || !routeGeometry) {
      return null;
    }

    return buildRouteRegion(routeGeometry.points);
  }, [routeGeometry, userLocation]);

  const routeFilters = useMemo(() => {
    const baseFilters = {
      isAccessible: null,
      isLocked: null,
      isCustomerOnly: null,
      openNow: null,
      noCodeRequired: null,
      recentlyVerifiedOnly: null,
      hasChangingTable: null,
      isFamilyRestroom: null,
      requireGrabBars: null,
      requireAutomaticDoor: null,
      requireGenderNeutral: null,
      minDoorWidth: null,
      minStallWidth: null,
      prioritizeAccessible: null,
      hideNonAccessible: null,
      minCleanlinessRating: null,
    };

    return mergeAccessibilityFilters(baseFilters, isAccessibilityMode, accessibilityPreferences);
  }, [accessibilityPreferences, isAccessibilityMode]);

  const bathroomsQuery = useBathrooms({
    region:
      routeRegion ?? {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
    filters: routeFilters,
    enabled: Boolean(routeRegion),
  });

  useEffect(() => {
    let isMounted = true;

    const resolveGeometry = async () => {
      if (!userLocation || !destination) {
        routeRequestIdRef.current += 1;
        if (isMounted) {
          setRouteGeometry(null);
          setIsLoadingRoute(false);
        }
        return;
      }

      const requestId = routeRequestIdRef.current + 1;
      routeRequestIdRef.current = requestId;
      setIsLoadingRoute(true);

      try {
        const nextRouteGeometry = await fetchRouteGeometry(userLocation, destination);

        if (!isMounted || requestId !== routeRequestIdRef.current) {
          return;
        }

        setRouteGeometry(nextRouteGeometry);
      } catch (error) {
        if (!isMounted || requestId !== routeRequestIdRef.current) {
          return;
        }

        showToast({
          title: 'Route unavailable',
          message: getErrorMessage(error, 'Unable to calculate route geometry right now.'),
          variant: 'warning',
        });
        setRouteGeometry(null);
      } finally {
        if (isMounted && requestId === routeRequestIdRef.current) {
          setIsLoadingRoute(false);
        }
      }
    };

    void resolveGeometry();

    return () => {
      isMounted = false;
    };
  }, [destination, showToast, userLocation]);

  const routeBathrooms = useMemo<RouteBathroomResult[]>(() => {
    if (!routeGeometry || !bathroomsQuery.data?.items.length) {
      return [];
    }

    return bathroomsQuery.data.items
      .filter((bathroom) => isBathroomVisibleOnMap(bathroom, isPremiumUser))
      .map((bathroom) => {
        const distanceToRoute = getClosestDistanceToPolyline(bathroom.coordinates, routeGeometry.points);

        if (!Number.isFinite(distanceToRoute) || distanceToRoute > ROUTE_CORRIDOR_BUFFER_M) {
          return null;
        }

        const detourMeters = Math.round(distanceToRoute * 2.2);
        const routeDistanceFromStartMeters = estimateRouteDistanceFromStart(
          routeGeometry.points,
          bathroom.coordinates
        );

        return {
          bathroom,
          detourMeters,
          routeDistanceFromStartMeters,
          rankScore: computeRouteBathroomRankScore({
            bathroom,
            detourMeters,
            distanceFromStartMeters: routeDistanceFromStartMeters,
            isAccessibilityMode,
          }),
        };
      })
      .filter((result): result is RouteBathroomResult => Boolean(result))
      .sort((left, right) => right.rankScore - left.rankScore);
  }, [bathroomsQuery.data?.items, isAccessibilityMode, isPremiumUser, routeGeometry]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: GooglePlaceAutocompleteSuggestion) => {
      try {
        const result = await resolveDestinationSelection(suggestion);

        setDestination(result.location);
        setDestinationLabel(result.formatted_address ?? suggestion.text);
        setDestinationQuery(suggestion.text);
        resetDestinationAutocompleteSession();
      } catch (error) {
        showToast({
          title: 'Destination unavailable',
          message: getErrorMessage(error, 'Unable to use that destination right now.'),
          variant: 'error',
        });
      }
    },
    [resetDestinationAutocompleteSession, resolveDestinationSelection, showToast]
  );

  const handleUseGeocodedDestination = useCallback(() => {
    if (!geocoded) {
      return;
    }

    setDestination(geocoded.coordinates);
    setDestinationLabel(geocoded.name);
    resetDestinationAutocompleteSession();
  }, [geocoded, resetDestinationAutocompleteSession]);

  const handleOpenBathroom = useCallback(
    (bathroom: BathroomListItem) => {
      const canonicalBathroomId = getCanonicalBathroomId(bathroom);
      const targetRoute =
        bathroom.listing_kind === 'source_candidate' && bathroom.source_record_id
          ? routes.candidateDetail(bathroom.source_record_id)
          : canonicalBathroomId
            ? routes.bathroomDetail(canonicalBathroomId)
            : routes.tabs.map;
      pushSafely(router, targetRoute, routes.tabs.map);
    },
    [router]
  );

  const handleNavigateToBathroom = useCallback(async (bathroom: BathroomListItem) => {
    const canonicalBathroomId = getCanonicalBathroomId(bathroom);
    const encodedLabel = encodeURIComponent(bathroom.place_name);
    const latitude = bathroom.coordinates.latitude;
    const longitude = bathroom.coordinates.longitude;
    const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
    const googleNavigationUrl = `google.navigation:q=${latitude},${longitude}`;
    const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    try {
      if (canonicalBathroomId) {
        void recordBathroomNavigationOpen(canonicalBathroomId);
      }

      if (user?.id && canonicalBathroomId) {
        recordVisitMutation.mutate({
          bathroomId: canonicalBathroomId,
          source: 'map_navigation',
        });
      }

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
        message: getErrorMessage(error, 'Unable to open navigation right now.'),
        variant: 'error',
      });
    }
  }, [recordVisitMutation, showToast, user?.id]);

  const isSearching = bathroomsQuery.isLoading || bathroomsQuery.isFetching || isLoadingRoute;

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-black tracking-tight text-ink-900">Bathrooms Along Route</Text>
          <Text className="mt-1 text-sm text-ink-500">
            Search an address and find ranked bathroom stops along the route.
          </Text>

          <View className="mt-4 rounded-xl border border-surface-strong bg-surface-card px-4 py-3">
            <TextInput
              autoCapitalize="none"
              className="text-sm text-ink-900"
              onChangeText={setDestinationQuery}
              onSubmitEditing={handleUseGeocodedDestination}
              placeholder="Search destination address"
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              value={destinationQuery}
            />
          </View>

          <PlacesAutocompleteDropdown
            error={destinationSuggestionError}
            isLoading={isLoadingDestinationSuggestions}
            onSelect={(suggestion) => {
              void handleSelectSuggestion(suggestion);
            }}
            showDistance
            suggestions={suggestions}
            variant="search"
            visible={suggestions.length > 0 || isLoadingDestinationSuggestions || Boolean(destinationSuggestionError)}
          />

          {destination && destinationLabel ? (
            <View className="mt-3 rounded-xl bg-brand-50 px-3 py-2">
              <Text className="text-xs font-semibold text-brand-700">Destination: {destinationLabel}</Text>
            </View>
          ) : null}

          {userLocation ? (
            <View className="mt-3 flex-row items-center gap-2">
              <Ionicons name="locate" size={14} color={colors.brand[600]} />
              <Text className="text-xs text-ink-500">
                Start: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            </View>
          ) : (
            <Text className="mt-3 text-xs text-warning">Location unavailable. Enable GPS first.</Text>
          )}

          {routeGeometry ? (
            <View className="mt-3 rounded-xl border border-surface-strong bg-surface-card px-3 py-2">
              <Text className="text-xs text-ink-600">
                Route source: {routeGeometry.source === 'google_directions' ? 'Google Directions' : 'Fallback corridor'}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-ink-700">
                Distance {formatDistance(routeGeometry.distanceMeters)}
                {typeof routeGeometry.durationMinutes === 'number'
                  ? ` | ETA ${routeGeometry.durationMinutes} min`
                  : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {isSearching && routeGeometry ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand[600]} />
            <Text className="mt-3 text-sm text-ink-500">Ranking bathrooms along your route...</Text>
          </View>
        ) : routeGeometry ? (
          <FlatList
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 100,
              gap: 12,
            }}
            data={routeBathrooms}
            keyExtractor={(item) => item.bathroom.id}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Ionicons name="navigate-circle-outline" size={48} color={colors.ink[300]} />
                <Text className="mt-3 text-sm text-ink-500">No bathrooms found near this route corridor.</Text>
              </View>
            }
            ListHeaderComponent={
              <Text className="text-sm font-bold text-ink-500">
                {routeBathrooms.length} bathroom{routeBathrooms.length !== 1 ? 's' : ''} ranked on route
              </Text>
            }
            renderItem={({ item, index }) => {
              const status = getStatusLabel(item.bathroom);
              const isVerified = Boolean(item.bathroom.verification_badge_type);

              return (
                <View className="rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4">
                  <Pressable
                    className="flex-row items-center gap-4"
                    onPress={() => handleOpenBathroom(item.bathroom)}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                      <Text className="text-sm font-black text-brand-600">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="flex-1 text-base font-bold text-ink-900" numberOfLines={1}>
                          {item.bathroom.place_name}
                        </Text>
                        {isVerified ? (
                          <Ionicons name="shield-checkmark" size={14} color={colors.brand[600]} />
                        ) : null}
                      </View>
                      <View className="mt-1 flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                          <Text className="text-xs font-semibold" style={{ color: status.color }}>
                            {status.label}
                          </Text>
                        </View>
                        <Text className="text-xs text-ink-500">Detour {formatDistance(item.detourMeters)}</Text>
                        <Text className="text-xs text-ink-500">From start {formatDistance(item.routeDistanceFromStartMeters)}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="walk-outline" size={14} color={colors.brand[700]} />
                        <Text className="text-sm font-black text-brand-700">{formatWalkTime(item.detourMeters)}</Text>
                      </View>
                    </View>
                  </Pressable>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      className="flex-1 rounded-xl border border-surface-strong bg-surface-base px-4 py-3"
                      onPress={() => {
                        void handleNavigateToBathroom(item.bathroom);
                      }}
                    >
                      <Text className="text-center text-sm font-semibold text-ink-900">Navigate</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 rounded-xl bg-brand-600 px-4 py-3"
                      onPress={() => handleOpenBathroom(item.bathroom)}
                    >
                      <Text className="text-center text-sm font-semibold text-white">Details</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="map-outline" size={64} color={colors.ink[200]} />
            <Text className="mt-4 text-center text-base font-bold text-ink-900">Plan your bathroom stops</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-ink-500">
              Search for a destination above to rank bathrooms by detour, status, confidence, and route relevance.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
