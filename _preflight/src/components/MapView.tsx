import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import NativeMapView, { Marker, Region } from 'react-native-maps';
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

  return (
    <View className="flex-1 overflow-hidden rounded-[32px] border border-surface-strong bg-surface-card">
      <NativeMapView
        region={region}
        onRegionChangeComplete={handleRegionChange}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={Boolean(userLocation)}
        style={{ flex: 1 }}
      >
        {bathrooms.map((bathroom) => (
          <Marker
            coordinate={bathroom.coordinates}
            description={bathroom.address}
            key={bathroom.id}
            onPress={() => onMarkerPress(bathroom.id)}
            pinColor={selectedBathroomId === bathroom.id ? colors.brand[700] : colors.brand[500]}
            title={bathroom.place_name}
          />
        ))}
      </NativeMapView>

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
