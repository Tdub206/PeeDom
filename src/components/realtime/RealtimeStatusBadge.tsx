import React, { memo } from 'react';
import { Text, View } from 'react-native';
import {
  selectHasAnyChannelError,
  selectIsConnected,
  selectTrackedChannelCount,
  useRealtimeStore,
} from '@/store/useRealtimeStore';

function RealtimeStatusBadgeComponent() {
  const isConnected = useRealtimeStore(selectIsConnected);
  const hasChannelError = useRealtimeStore(selectHasAnyChannelError);
  const trackedChannelCount = useRealtimeStore(selectTrackedChannelCount);
  const reconnectAttempts = useRealtimeStore((state) => state.reconnectAttempts);

  if (trackedChannelCount === 0 || (isConnected && !hasChannelError)) {
    return null;
  }

  const isReconnecting = reconnectAttempts > 0 || !isConnected;

  return (
    <View
      accessible
      accessibilityLabel={isReconnecting ? 'Reconnecting to live updates' : 'Live updates offline'}
      className={[
        'self-start rounded-full px-3 py-1.5',
        isReconnecting ? 'bg-warning/15' : 'bg-danger/15',
      ].join(' ')}
    >
      <Text
        className={[
          'text-xs font-semibold uppercase tracking-[0.9px]',
          isReconnecting ? 'text-warning' : 'text-danger',
        ].join(' ')}
      >
        {isReconnecting ? 'Reconnecting...' : 'Offline'}
      </Text>
    </View>
  );
}

export const RealtimeStatusBadge = memo(RealtimeStatusBadgeComponent);
