import React, { memo } from 'react';
import { Text, View } from 'react-native';

interface LiveCodeBadgeProps {
  isVisible: boolean;
}

function LiveCodeBadgeComponent({ isVisible }: LiveCodeBadgeProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5">
      <View className="h-2 w-2 rounded-full bg-success" />
      <Text className="text-xs font-bold uppercase tracking-[1px] text-success">Live Sync</Text>
    </View>
  );
}

export const LiveCodeBadge = memo(LiveCodeBadgeComponent);
