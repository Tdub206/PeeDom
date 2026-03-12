import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { BathroomListItem, Coordinates, RegionBounds } from '@/types';

interface BathroomMapViewProps {
  bathrooms: BathroomListItem[];
  region: RegionBounds;
  selectedBathroomId: string | null;
  userLocation: Coordinates | null;
  isRefreshingLocation: boolean;
  onLocateMe: () => void;
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

function getClusterDiameter(pointCount: number): number {
  if (pointCount >= 50) {
    return 58;
  }

  if (pointCount >= 20) {
    return 52;
  }

  return 46;
}

function BathroomMapViewComponent({
  bathrooms,
  region,
  selectedBathroomId,
  userLocation,
  isRefreshingLocation,
  onLocateMe,
  onMarkerPress,
  onRegionChangeComplete,
}: BathroomMapViewProps) {
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

  const renderCluster = useCallback((cluster: ClusterRenderInput) => {
    const clusterSize = getClusterDiameter(cluster.properties.point_count);

    return (
      <Marker
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
        edgePadding={{ top: 80, right: 80, bottom: 80, left: 80 }}
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
        {bathrooms.map((bathroom) => (
          <Marker
            coordinate={bathroom.coordinates}
            description={bathroom.address}
            key={bathroom.id}
            onPress={() => onMarkerPress(bathroom.id)}
            pinColor={selectedBathroomId === bathroom.id ? colors.brand[700] : colors.brand[500]}
            title={bathroom.place_name}
            tracksViewChanges={false}
          />
        ))}
      </MapView>

      <View pointerEvents="box-none" className="absolute left-4 right-4 top-4 flex-row justify-between">
        <View className="rounded-2xl bg-surface-card/95 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Nearby pins</Text>
          <Text className="mt-1 text-lg font-black text-ink-900">{bathrooms.length} bathrooms</Text>
        </View>

        <Pressable
          accessibilityLabel="Center on my location"
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
      </View>
    </View>
  );
}

export const BathroomMapView = memo(BathroomMapViewComponent);
