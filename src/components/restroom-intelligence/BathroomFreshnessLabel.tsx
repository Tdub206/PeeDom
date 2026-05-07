import { memo } from 'react';
import { Text, View } from 'react-native';
import { formatConfirmationRecencyLabel } from '@/lib/restroom-intelligence/trust-summary';

interface BathroomFreshnessLabelProps {
  lastConfirmedAt: string | null;
  staleFieldsCount?: number;
  compact?: boolean;
}

function BathroomFreshnessLabelComponent({
  lastConfirmedAt,
  staleFieldsCount = 0,
  compact = false,
}: BathroomFreshnessLabelProps) {
  const recencyLabel = formatConfirmationRecencyLabel(lastConfirmedAt);
  const isStale = staleFieldsCount > 0 || recencyLabel === 'Stale';

  return (
    <View
      className={[
        'self-start rounded-full border px-3 py-1.5',
        isStale ? 'border-warning/20 bg-warning/10' : 'border-brand-200 bg-brand-50',
      ].join(' ')}
    >
      <Text
        className={[
          'font-semibold',
          compact ? 'text-xs' : 'text-sm',
          isStale ? 'text-warning' : 'text-brand-700',
        ].join(' ')}
      >
        {recencyLabel}
      </Text>
    </View>
  );
}

export const BathroomFreshnessLabel = memo(BathroomFreshnessLabelComponent);
