import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import type { PremiumArrivalAlert } from '@/types';

interface PremiumArrivalAlertCardProps {
  activeAlert: PremiumArrivalAlert | null;
  isLoading: boolean;
  isPremiumUser: boolean;
  isUpdating: boolean;
  onArmAlert: (minutes: 15 | 30 | 60) => void;
  onCancelAlert: () => void;
}

function formatArrivalTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'soon';
  }

  return parsedDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PremiumArrivalAlertCardComponent({
  activeAlert,
  isLoading,
  isPremiumUser,
  isUpdating,
  onArmAlert,
  onCancelAlert,
}: PremiumArrivalAlertCardProps) {
  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Arrival Alert</Text>
      <Text className="mt-3 text-2xl font-bold text-ink-900">
        {activeAlert ? 'Monitoring this stop' : 'Watch for code changes while you travel'}
      </Text>
      <Text className="mt-2 text-base leading-6 text-ink-600">
        {isPremiumUser
          ? 'Arm a premium alert when you are on the way and Pee-Dom will push a warning if the code changes before you arrive.'
          : 'Premium unlocks pre-arrival code alerts while you are on the way to a bathroom.'}
      </Text>

      {isLoading ? (
        <Text className="mt-4 text-sm text-ink-600">Loading your current arrival alert...</Text>
      ) : null}

      {activeAlert ? (
        <View className="mt-4 rounded-2xl bg-brand-50 px-4 py-4">
          <Text className="text-sm font-semibold text-brand-700">
            Active for the next {activeAlert.lead_minutes} minutes
          </Text>
          <Text className="mt-1 text-sm text-brand-700">
            Target arrival: {formatArrivalTime(activeAlert.target_arrival_at)}
          </Text>
          <Button
            className="mt-4"
            label={isUpdating ? 'Cancelling Alert...' : 'Cancel Arrival Alert'}
            loading={isUpdating}
            onPress={onCancelAlert}
            variant="secondary"
          />
        </View>
      ) : (
        <View className="mt-4 gap-3">
          {[15, 30, 60].map((minutes) => (
            <Button
              key={minutes}
              className="w-full"
              disabled={!isPremiumUser}
              label={isUpdating ? 'Arming Arrival Alert...' : `Arriving In ${minutes} Minutes`}
              loading={isUpdating}
              onPress={() => onArmAlert(minutes as 15 | 30 | 60)}
              variant={minutes === 30 ? 'primary' : 'secondary'}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export const PremiumArrivalAlertCard = memo(PremiumArrivalAlertCardComponent);
