import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function OfflineBannerComponent() {
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  if (netInfo.isConnected !== false) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 z-40 rounded-2xl bg-warning px-4 py-3"
      style={{ top: insets.top + 12 }}
    >
      <Text className="text-sm font-semibold text-white">Offline mode</Text>
      <Text className="mt-1 text-sm leading-5 text-white/90">
        Showing cached bathrooms and keeping favorite changes queued until the connection returns.
      </Text>
    </View>
  );
}

export const OfflineBanner = memo(OfflineBannerComponent);
