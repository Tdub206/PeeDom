import { memo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import type { BathroomLiveStatus } from '@/types';

interface QuickVisitActionsCardProps {
  currentStatusLabel?: string | null;
  isSubmitting: boolean;
  pendingStatus: BathroomLiveStatus | null;
  onConfirmClean: () => void;
  onReportDirty: () => void;
  onReportClosed: () => void;
  onRateCleanliness: () => void;
}

function QuickVisitActionsCardComponent({
  currentStatusLabel,
  isSubmitting,
  pendingStatus,
  onConfirmClean,
  onReportDirty,
  onReportClosed,
  onRateCleanliness,
}: QuickVisitActionsCardProps) {
  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">After your visit</Text>
      <Text className="mt-3 text-2xl font-bold text-ink-900">Confirm what happened in one tap.</Text>
      <Text className="mt-2 text-base leading-6 text-ink-600">
        Quick confirmations keep the trust model fresh, help resolve stale listings, and make the next route choice more dependable.
      </Text>
      {currentStatusLabel ? (
        <Text className="mt-3 text-sm font-semibold text-ink-700">Current live status: {currentStatusLabel}</Text>
      ) : null}

      <View className="mt-5 gap-3">
        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            disabled={isSubmitting}
            fullWidth={false}
            label="Still Clean"
            loading={isSubmitting && pendingStatus === 'clean'}
            onPress={onConfirmClean}
          />
          <Button
            className="flex-1"
            disabled={isSubmitting}
            fullWidth={false}
            label="Needs Cleaning"
            loading={isSubmitting && pendingStatus === 'dirty'}
            onPress={onReportDirty}
            variant="secondary"
          />
        </View>
        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            disabled={isSubmitting}
            fullWidth={false}
            label="Closed / Unavailable"
            loading={isSubmitting && pendingStatus === 'closed'}
            onPress={onReportClosed}
            variant="destructive"
          />
          <Button
            className="flex-1"
            disabled={isSubmitting}
            fullWidth={false}
            label="Rate Cleanliness"
            onPress={onRateCleanliness}
            variant="ghost"
          />
        </View>
      </View>
    </View>
  );
}

export const QuickVisitActionsCard = memo(QuickVisitActionsCardComponent);
