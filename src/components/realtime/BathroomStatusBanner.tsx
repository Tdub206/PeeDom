import React, { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { routes } from '@/constants/routes';
import { useBathroomLiveStatus } from '@/hooks/useBathroomLiveStatus';
import {
  formatBathroomStatusTimestamp,
  getBathroomStatusEmoji,
  getBathroomStatusLabel,
  getBathroomStatusTone,
} from '@/lib/bathroom-status';
import { pushSafely } from '@/lib/navigation';

interface BathroomStatusBannerProps {
  bathroomId: string;
}

function BathroomStatusBannerComponent({ bathroomId }: BathroomStatusBannerProps) {
  const router = useRouter();
  const { currentStatus, isLoadingCurrentStatus } = useBathroomLiveStatus(bathroomId);
  const tone = useMemo(
    () => (currentStatus ? getBathroomStatusTone(currentStatus.status) : null),
    [currentStatus]
  );

  if (isLoadingCurrentStatus) {
    return (
      <View className="mt-6 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-4">
        <Text className="text-sm text-ink-600">Loading the latest community status update...</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint="Opens the live status form for this bathroom."
      accessibilityRole="button"
      className={[
        'mt-6 rounded-[28px] border px-5 py-5',
        currentStatus && tone
          ? `${tone.backgroundClassName} ${tone.borderClassName}`
          : 'border-dashed border-surface-strong bg-surface-card',
      ].join(' ')}
      onPress={() =>
        pushSafely(router, routes.modal.liveStatusBathroom(bathroomId), routes.bathroomDetail(bathroomId))
      }
    >
      {currentStatus ? (
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text
              className={[
                'text-sm font-semibold uppercase tracking-[1px]',
                tone?.textClassName ?? 'text-ink-700',
              ].join(' ')}
            >
              Live Status
            </Text>
            <Text className={['mt-3 text-2xl font-black', tone?.textClassName ?? 'text-ink-900'].join(' ')}>
              {getBathroomStatusEmoji(currentStatus.status)} {getBathroomStatusLabel(currentStatus.status)}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-ink-700">
              {formatBathroomStatusTimestamp(currentStatus.created_at)}
            </Text>
            {currentStatus.note ? (
              <Text className="mt-2 text-sm leading-5 text-ink-700">{currentStatus.note}</Text>
            ) : null}
          </View>
          <Text className="text-sm font-semibold text-ink-700">Update</Text>
        </View>
      ) : (
        <>
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Live Status</Text>
          <Text className="mt-3 text-2xl font-black text-ink-900">Share the current bathroom condition</Text>
          <Text className="mt-2 text-base leading-6 text-ink-600">
            Crowd-sourced status updates last for two hours and help the next person decide before they head over.
          </Text>
        </>
      )}
    </Pressable>
  );
}

export const BathroomStatusBanner = memo(BathroomStatusBannerComponent);
