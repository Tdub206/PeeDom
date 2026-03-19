import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Circle, Marker, Polyline, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { BathroomListItem, Coordinates, RegionBounds } from '@/types';
import { buildBathroomAccessibilityLabel } from '@/utils/accessibility';
import { calculateDistanceMeters, getBathroomMapPinTone } from '@/utils/bathroom';

interface BathroomMapViewProps {
  bathrooms: BathroomListItem[];
  region: RegionBounds;
  selectedBathroomId: string | null;
  userLocation: Coordinates | null;
  isRefreshingLocation: boolean;
  activeFilterCount: number;
  onLocateMe: () => void;
  onFilterPress: () => void;
  onMarkerPress: (bathroomId: string) => void;
  onRegionChangeComplete: (region: RegionBounds) => void;
}

interface ClusterRenderInput {
  id: string | number;
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    point_count: number;
  };
  onPress: () => void;
}

type PinPalette = {
  backgroundColor: string;
  borderColor: string;
  label: string;
};

const PIN_PALETTES: Record<ReturnType<typeof getBathroomMapPinTone>, PinPalette> = {
  open_unlocked: {
    backgroundColor: colors.success,
    borderColor: '#d7f3e5',
    label: 'Open + unlocked',
  },
  locked_with_code: {
    backgroundColor: colors.warning,
    borderColor: '#f6deb7',
    label: 'Locked + code available',
  },
  locked_without_code: {
    backgroundColor: colors.danger,
    borderColor: '#f3cccc',
    label: 'Locked + no code',
  },
  unknown_hours: {
    backgroundColor: colors.ink[400],
    borderColor: '#e2e8f0',
    label: 'Unknown hours',
  },
};

function getClusterDiameter(pointCount: number): number {
  if (pointCount >= 50) {
    return 58;
  }

  if (pointCount >= 20) {
    return 52;
  }

  return 46;
}

function toRgba(hexColor: string, opacity: number): string {
  const normalizedHex = hexColor.replace('#', '');
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function MapLegend() {
  return (
    <View className="absolute bottom-4 left-4 rounded-3xl bg-surface-card/95 px-4 py-4">
      {Object.values(PIN_PALETTES).map((palette) => (
        <View className="mt-2 flex-row items-center gap-2 first:mt-0" key={palette.label}>
          <View
            className="h-3.5 w-3.5 rounded-full border"
            style={{
              backgroundColor: palette.backgroundColor,
              borderColor: palette.borderColor,
            }}
          />
          <Text className="text-xs font-medium text-ink-700">{palette.label}</Text>
        </View>
      ))}
    </View>
  );
}

function BathroomMapViewComponent({
  bathrooms,
  region,
  selectedBathroomId,
  userLocation,
  isRefreshingLocation,
  activeFilterCount,
  onLocateMe,
  onFilterPress,
  onMarkerPress,
  onRegionChangeComplete,
}: BathroomMapViewProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [pulseProgress, setPulseProgress] = useState(0);

  useEffect(() => {
    const listenerId = pulse.addListener(({ value }) => {
      setPulseProgress(value);
    });

    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      })
    );

    animation.start();

    return () => {
      animation.stop();
      pulse.removeListener(listenerId);
      pulse.setValue(0);
    };
  }, [pulse]);

  const handleRegionChange = useCallback(
    (nextRegion: Region) => {
      onRegionChangeComplete({
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
        latitudeDelta: nextRegion.latitudeDelta,
        longitudeDelta: nextRegion.longitudeDelta,
      });
    },
    [onRegionChangeComplete]
  );

  const nearestHighlightedBathroom = useMemo(() => {
    if (!userLocation || !bathrooms.length) {
      return null;
    }

    const rankedBathrooms = bathrooms
      .map((bathroom) => ({
        bathroom,
        distance: calculateDistanceMeters(userLocation, bathroom.coordinates),
        tone: getBathroomMapPinTone(bathroom),
      }))
      .filter((bathroom) => bathroom.tone === 'open_unlocked' || bathroom.tone === 'locked_with_code')
      .sort((leftBathroom, rightBathroom) => leftBathroom.distance - rightBathroom.distance);

    return rankedBathrooms[0]?.bathroom ?? null;
  }, [bathrooms, userLocation]);

  const radarRadius = 60 + pulseProgress * 180;
  const radarOpacity = 0.24 * (1 - pulseProgress);

  const renderCluster = useCallback((cluster: ClusterRenderInput) => {
    const clusterSize = getClusterDiameter(cluster.properties.point_count);

    return (
      <Marker
        accessibilityHint="Double tap to zoom into this cluster of bathrooms."
        accessibilityLabel={`${cluster.properties.point_count} bathrooms grouped together`}
        accessibilityRole="button"
        coordinate={{
          latitude: cluster.geometry.coordinates[1],
          longitude: cluster.geometry.coordinates[0],
        }}
        key={`cluster-${cluster.id}`}
        onPress={cluster.onPress}
        tracksViewChanges={false}
      >
        <View
          className="items-center justify-center rounded-full border-4 border-white bg-brand-600"
          style={{
            height: clusterSize,
            width: clusterSize,
            shadowColor: colors.ink[900],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Text className="text-xs font-black text-white">{cluster.properties.point_count}</Text>
        </View>
      </Marker>
    );
  }, []);

  return (
    <View className="flex-1 overflow-hidden rounded-[32px] border border-surface-strong bg-surface-card">
      <MapView
        animationEnabled
        clusterColor={colors.brand[600]}
        clusterTextColor={colors.surface.card}
        edgePadding={{ top: 80, right: 80, bottom: 120, left: 80 }}
        onRegionChangeComplete={handleRegionChange}
        preserveClusterPressBehavior={false}
        radius={42}
        region={region}
        renderCluster={renderCluster}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={Boolean(userLocation)}
        spiralEnabled
        style={{ flex: 1 }}
        tracksViewChanges={false}
      >
        {userLocation ? (
          <>
            <Circle
              center={userLocation}
              fillColor={toRgba(colors.brand[500], radarOpacity)}
              radius={radarRadius}
              strokeColor={toRgba(colors.brand[500], 0)}
            />
            <Circle
              center={userLocation}
              fillColor={toRgba(colors.brand[600], 0.12)}
              radius={24}
              strokeColor={toRgba(colors.brand[600], 0.18)}
            />
          </>
        ) : null}

        {userLocation && nearestHighlightedBathroom ? (
          <Polyline
            coordinates={[userLocation, nearestHighlightedBathroom.coordinates]}
            lineDashPattern={[12, 8]}
            strokeColor={toRgba(colors.brand[700], 0.6)}
            strokeWidth={3}
          />
        ) : null}

        {bathrooms.map((bathroom) => {
          const tone = getBathroomMapPinTone(bathroom);
          const palette = PIN_PALETTES[tone];
          const isSelected = selectedBathroomId === bathroom.id;

          return (
            <Marker
              accessibilityHint="Double tap to open the bathroom preview card."
              accessibilityLabel={buildBathroomAccessibilityLabel(bathroom)}
              accessibilityRole="button"
              coordinate={bathroom.coordinates}
              description={bathroom.address}
              key={`${bathroom.id}-${isSelected ? 'selected' : 'idle'}`}
              onPress={() => onMarkerPress(bathroom.id)}
              title={bathroom.place_name}
              tracksViewChanges={false}
            >
              <View
                className="items-center justify-center rounded-full border-4 bg-white"
                style={{
                  borderColor: palette.borderColor,
                  height: isSelected ? 34 : 28,
                  width: isSelected ? 34 : 28,
                  shadowColor: colors.ink[900],
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <View
                  className="rounded-full"
                  style={{
                    backgroundColor: palette.backgroundColor,
                    height: isSelected ? 18 : 14,
                    width: isSelected ? 18 : 14,
                  }}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View pointerEvents="box-none" className="absolute left-4 right-4 top-4 flex-row justify-between">
        <View className="rounded-2xl bg-surface-card/95 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Nearby pins</Text>
          <Text className="mt-1 text-lg font-black text-ink-900">{bathrooms.length} bathrooms</Text>
          {nearestHighlightedBathroom ? (
            <Text className="mt-1 text-xs text-brand-700">Closest live match: {nearestHighlightedBathroom.place_name}</Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Pressable
            accessibilityLabel="Center on my location"
            accessibilityHint="Refreshes your location and centers the map on you."
            accessibilityRole="button"
            className={[
              'h-14 w-14 items-center justify-center rounded-2xl border bg-surface-card/95',
              isRefreshingLocation ? 'border-brand-200' : 'border-surface-strong',
            ].join(' ')}
            onPress={onLocateMe}
          >
            <Ionicons
              color={isRefreshingLocation ? colors.brand[600] : colors.ink[700]}
              name={isRefreshingLocation ? 'locate' : 'locate-outline'}
              size={22}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Open map filters"
            accessibilityHint="Opens the filter drawer for access, cleanliness, and accessibility preferences."
            accessibilityRole="button"
            className="h-14 min-w-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-surface-strong bg-surface-card/95 px-4"
            onPress={onFilterPress}
          >
            <Ionicons color={colors.ink[700]} name="options-outline" size={20} />
            {activeFilterCount > 0 ? (
              <View className="rounded-full bg-brand-600 px-2 py-0.5">
                <Text className="text-xs font-black text-white">{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <MapLegend />
    </View>
  );
}

export const BathroomMapView = memo(BathroomMapViewComponent);
