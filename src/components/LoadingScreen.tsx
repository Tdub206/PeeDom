import React, { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

interface LoadingScreenProps {
  message?: string;
}

function LoadingScreenComponent({
  message = 'Preparing the map, session, and nearby bathroom data.',
}: LoadingScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <View className="flex-1 justify-between px-6 py-10">
        <View className="gap-4">
          <View className="h-28 w-28 rounded-[32px] bg-brand-600/10" />
          <Text className="text-4xl font-black tracking-tight text-ink-900">Pee-Dom</Text>
          <Text className="max-w-[300px] text-base leading-6 text-ink-600">{message}</Text>
        </View>
        <View className="gap-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
          <View className="flex-row items-center gap-4">
            <ActivityIndicator color={colors.brand[600]} size="small" />
            <Text className="flex-1 text-sm font-medium text-ink-700">
              Syncing authentication and launch dependencies.
            </Text>
          </View>
          <View className="h-2 rounded-full bg-surface-muted">
            <View className="h-2 w-2/3 rounded-full bg-brand-600" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export const LoadingScreen = memo(LoadingScreenComponent);
