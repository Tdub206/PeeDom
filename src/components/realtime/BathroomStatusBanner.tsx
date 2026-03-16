import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomLiveStatus } from '@/hooks/useBathroomLiveStatus';
import {
  formatBathroomStatusTimestamp,
  getBathroomStatusEmoji,
  getBathroomStatusLabel,
  getBathroomStatusTone,
} from '@/lib/bathroom-status';
import type { BathroomLiveStatus } from '@/types';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS: { label: string; status: BathroomLiveStatus }[] = [
  { label: 'Recently cleaned', status: 'clean' },
  { label: 'Needs cleaning', status: 'dirty' },
  { label: 'Reported closed', status: 'closed' },
  { label: 'Out of order', status: 'out_of_order' },
  { label: 'Long wait', status: 'long_wait' },
];

interface BathroomStatusBannerProps {
  bathroomId: string;
}

function BathroomStatusBannerComponent({ bathroomId }: BathroomStatusBannerProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { currentStatus, isLoadingCurrentStatus, isReportingStatus, reportStatus } = useBathroomLiveStatus(bathroomId);
  const tone = useMemo(
    () => (currentStatus ? getBathroomStatusTone(currentStatus.status) : null),
    [currentStatus]
  );

  const openPicker = useCallback(() => {
    if (!isAuthenticated) {
      showToast({
        title: 'Sign in required',
        message: 'Create an account or sign in to share live bathroom status updates.',
        variant: 'warning',
      });
      return;
    }

    setIsPickerOpen(true);
  }, [isAuthenticated, showToast]);

  const handleSelectStatus = useCallback(
    async (status: BathroomLiveStatus) => {
      const didReport = await reportStatus(status);

      if (didReport) {
        setIsPickerOpen(false);
      }
    },
    [reportStatus]
  );

  if (isLoadingCurrentStatus) {
    return (
      <View className="mt-6 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-4">
        <Text className="text-sm text-ink-600">Loading the latest community status update...</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        className={[
          'mt-6 rounded-[28px] border px-5 py-5',
          currentStatus && tone
            ? `${tone.backgroundClassName} ${tone.borderClassName}`
            : 'border-dashed border-surface-strong bg-surface-card',
        ].join(' ')}
        onPress={openPicker}
      >
        {currentStatus ? (
          <>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className={['text-sm font-semibold uppercase tracking-[1px]', tone?.textClassName ?? 'text-ink-700'].join(' ')}>
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
          </>
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

      <Modal animationType="slide" transparent visible={isPickerOpen} onRequestClose={() => setIsPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setIsPickerOpen(false)}>
          <Pressable className="rounded-t-[32px] bg-surface-card px-6 pb-10 pt-4" onPress={() => undefined}>
            <View className="mx-auto h-1.5 w-14 rounded-full bg-surface-strong" />
            <Text className="mt-5 text-2xl font-black text-ink-900">What is it like right now?</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">
              Pick the most accurate live status. Each report stays visible for two hours.
            </Text>

            <View className="mt-6 gap-3">
              {STATUS_OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  className={[
                    'rounded-3xl border px-5 py-4',
                    currentStatus?.status === option.status
                      ? 'border-brand-200 bg-brand-50'
                      : 'border-surface-strong bg-surface-base',
                    isReportingStatus ? 'opacity-60' : '',
                  ].join(' ')}
                  disabled={isReportingStatus}
                  key={option.status}
                  onPress={() => {
                    void handleSelectStatus(option.status);
                  }}
                >
                  <Text className="text-lg font-bold text-ink-900">
                    {getBathroomStatusEmoji(option.status)} {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isReportingStatus ? (
              <View className="mt-6 flex-row items-center gap-3">
                <ActivityIndicator color="#2563eb" />
                <Text className="text-sm text-ink-600">Saving your live status update...</Text>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const BathroomStatusBanner = memo(BathroomStatusBannerComponent);
