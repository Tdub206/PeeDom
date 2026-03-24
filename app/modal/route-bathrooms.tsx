import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useLocation } from '@/hooks/useLocation';
import { useBathrooms } from '@/hooks/useBathrooms';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { BathroomListItem, Coordinates, RegionBounds } from '@/types';
import { calculateDistanceMeters, getBathroomMapPinTone, mergeAccessibilityFilters } from '@/utils/bathroom';
import { pushSafely } from '@/lib/navigation';

const AVG_WALK_SPEED_M_PER_MIN = 80;
/** Buffer distance from the route corridor in meters */
const CORRIDOR_BUFFER_M = 300;

/**
 * Calculate perpendicular distance from a point to a line segment.
 * Returns distance in meters.
 */
function pointToSegmentDistance(
  point: Coordinates,
  segStart: Coordinates,
  segEnd: Coordinates,
): number {
  const dx = segEnd.longitude - segStart.longitude;
  const dy = segEnd.latitude - segStart.latitude;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return calculateDistanceMeters(point, segStart);
  }

  let t =
    ((point.longitude - segStart.longitude) * dx + (point.latitude - segStart.latitude) * dy) /
    lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj: Coordinates = {
    latitude: segStart.latitude + t * dy,
    longitude: segStart.longitude + t * dx,
  };

  return calculateDistanceMeters(point, proj);
}

/**
 * Filter bathrooms that are within `bufferMeters` of the straight-line corridor
 * between start and end.
 */
function filterBathroomsAlongCorridor(
  bathrooms: BathroomListItem[],
  start: Coordinates,
  end: Coordinates,
  bufferMeters: number,
): BathroomListItem[] {
  return bathrooms.filter((bathroom) => {
    const dist = pointToSegmentDistance(bathroom.coordinates, start, end);
    return dist <= bufferMeters;
  });
}

/** Build a region that encompasses both start and end with padding */
function buildCorridorRegion(start: Coordinates, end: Coordinates): RegionBounds {
  const centerLat = (start.latitude + end.latitude) / 2;
  const centerLng = (start.longitude + end.longitude) / 2;
  const latDelta = Math.abs(start.latitude - end.latitude) * 1.5 + 0.01;
  const lngDelta = Math.abs(start.longitude - end.longitude) * 1.5 + 0.01;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function formatWalkTime(meters?: number): string {
  if (typeof meters !== 'number' || meters <= 0) return '?';
  const mins = Math.ceil(meters / AVG_WALK_SPEED_M_PER_MIN);
  if (mins <= 1) return '~1 min';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return r > 0 ? `~${h}h ${r}m` : `~${h}h`;
  }
  return `~${mins} min`;
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

export default function RouteBathroomsScreen() {
  const router = useRouter();
  const { coordinates: userLocation } = useLocation();
  const isAccessibilityMode = useAccessibilityStore((s) => s.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((s) => s.preferences);

  const [destinationText, setDestinationText] = useState('');
  const [destination, setDestination] = useState<Coordinates | null>(null);

  // Use a corridor region to search bathrooms
  const corridorRegion = useMemo<RegionBounds | null>(() => {
    if (!userLocation || !destination) return null;
    return buildCorridorRegion(userLocation, destination);
  }, [userLocation, destination]);

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
  }, [isAccessibilityMode, accessibilityPreferences]);

  const { data: bathroomResult, isLoading } = useBathrooms({
    region: corridorRegion ?? {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    filters: routeFilters,
    enabled: Boolean(corridorRegion),
  });

  const allBathrooms = bathroomResult?.items ?? [];

  const corridorBathrooms = useMemo(() => {
    if (!userLocation || !destination || !allBathrooms.length) return [];
    return filterBathroomsAlongCorridor(allBathrooms, userLocation, destination, CORRIDOR_BUFFER_M)
      .sort((a, b) => {
        const da = calculateDistanceMeters(userLocation, a.coordinates);
        const db = calculateDistanceMeters(userLocation, b.coordinates);
        // When accessibility mode is on, boost accessible bathrooms within similar range
        if (isAccessibilityMode) {
          const aScore = a.accessibility_score ?? 0;
          const bScore = b.accessibility_score ?? 0;
          if (aScore > 30 !== bScore > 30) {
            const closer = Math.min(da, db);
            const farther = Math.max(da, db);
            if (farther <= closer * 1.5) {
              return aScore > 30 ? -1 : 1;
            }
          }
        }
        return da - db;
      });
  }, [allBathrooms, userLocation, destination, isAccessibilityMode]);

  const handleSetDestination = useCallback(() => {
    // Parse "lat, lng" format
    const parts = destinationText.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      setDestination({ latitude: parts[0], longitude: parts[1] });
    }
  }, [destinationText]);

  const handleOpenBathroom = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    },
    [router],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-black tracking-tight text-ink-900">
            Bathrooms Along Route
          </Text>
          <Text className="mt-1 text-sm text-ink-500">
            Find restrooms along your commute. Enter destination coordinates (lat, lng).
          </Text>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <TextInput
                className="rounded-xl border border-surface-strong bg-surface-card px-4 py-3 text-sm text-ink-900"
                placeholder="Destination (e.g. 47.606, -122.332)"
                placeholderTextColor="#9ca3af"
                value={destinationText}
                onChangeText={setDestinationText}
                onSubmitEditing={handleSetDestination}
                keyboardType="numbers-and-punctuation"
                returnKeyType="search"
              />
            </View>
            <Pressable
              className="items-center justify-center rounded-xl bg-brand-600 px-5"
              onPress={handleSetDestination}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </Pressable>
          </View>

          {userLocation ? (
            <View className="mt-3 flex-row items-center gap-2">
              <Ionicons name="locate" size={14} color={colors.brand[600]} />
              <Text className="text-xs text-ink-500">
                From: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            </View>
          ) : (
            <Text className="mt-3 text-xs text-warning">Location unavailable — enable GPS</Text>
          )}

          {isAccessibilityMode ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-brand-50 px-3 py-2">
              <Ionicons name="accessibility" size={14} color={colors.brand[600]} />
              <Text className="text-xs font-semibold text-brand-700">
                Accessibility mode — prioritizing accessible bathrooms
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading && corridorRegion ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand[600]} />
            <Text className="mt-3 text-sm text-ink-500">Searching corridor…</Text>
          </View>
        ) : destination ? (
          <FlatList
            data={corridorBathrooms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 12 }}
            renderItem={({ item, index }) => {
              const status = getStatusLabel(item);
              const isVerified = Boolean(item.verification_badge_type);
              const distFromStart = item.distance_meters;

              return (
                <Pressable
                  className="flex-row items-center gap-4 rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4"
                  onPress={() => handleOpenBathroom(item.id)}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                    <Text className="text-sm font-black text-brand-600">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 text-base font-bold text-ink-900" numberOfLines={1}>
                        {item.place_name}
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
                      {item.flags.is_accessible ? (
                        <Text className="text-xs font-semibold text-brand-600">Accessible</Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="walk-outline" size={14} color={colors.brand[700]} />
                      <Text className="text-sm font-black text-brand-700">
                        {formatWalkTime(distFromStart)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Ionicons name="navigate-circle-outline" size={48} color={colors.ink[300]} />
                <Text className="mt-3 text-sm text-ink-500">
                  No bathrooms found within 300m of this route
                </Text>
              </View>
            }
            ListHeaderComponent={
              <Text className="text-sm font-bold text-ink-500">
                {corridorBathrooms.length} bathroom{corridorBathrooms.length !== 1 ? 's' : ''} along route
              </Text>
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="map-outline" size={64} color={colors.ink[200]} />
            <Text className="mt-4 text-center text-base font-bold text-ink-900">
              Plan your bathroom stops
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-ink-500">
              Enter your destination above to find restrooms along your commute route.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
