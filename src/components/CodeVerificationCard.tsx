import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';

interface CodeVerificationCardProps {
  currentVote?: -1 | 1 | null;
  hasCode: boolean;
  pendingVote?: -1 | 1 | null;
  isSubmitting: boolean;
  onWorked: () => void;
  onFailed: () => void;
}

function CodeVerificationCardComponent({
  currentVote = null,
  hasCode,
  pendingVote = null,
  isSubmitting,
  onWorked,
  onFailed,
}: CodeVerificationCardProps) {
  if (!hasCode) {
    return null;
  }

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Verification Loop</Text>
      <Text className="mt-3 text-2xl font-bold text-ink-900">Did this code work?</Text>
      <Text className="mt-2 text-base leading-6 text-ink-600">
        A quick yes or no keeps Pee-Dom trustworthy. A successful verification can award trust points.
      </Text>

      <View className="mt-5 flex-row gap-3">
        <Button
          className="flex-1"
          disabled={isSubmitting}
          fullWidth={false}
          label={currentVote === 1 ? 'Worked' : 'Yes, it worked'}
          loading={isSubmitting && pendingVote === 1}
          onPress={onWorked}
          variant={currentVote === 1 ? 'secondary' : 'primary'}
        />
        <Button
          className="flex-1"
          disabled={isSubmitting}
          fullWidth={false}
          label={currentVote === -1 ? 'Reported' : 'No, it failed'}
          loading={isSubmitting && pendingVote === -1}
          onPress={onFailed}
          variant={currentVote === -1 ? 'secondary' : 'destructive'}
        />
      </View>
    </View>
  );
}

export const CodeVerificationCard = memo(CodeVerificationCardComponent);
