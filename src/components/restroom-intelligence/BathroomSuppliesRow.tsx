import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BathroomNeedMetadata } from '@/types';

interface BathroomSuppliesRowProps {
  metadata: BathroomNeedMetadata | null;
}

function buildSupplyEntries(metadata: BathroomNeedMetadata | null): Array<{ label: string; available: boolean | null }> {
  return [
    { label: 'Toilet paper', available: metadata?.has_toilet_paper ?? null },
    { label: 'Soap', available: metadata?.has_soap ?? null },
    { label: 'Hand dryer', available: metadata?.has_hand_dryer ?? null },
    { label: 'Paper towels', available: metadata?.has_paper_towels ?? null },
  ];
}

function BathroomSuppliesRowComponent({ metadata }: BathroomSuppliesRowProps) {
  const supplies = buildSupplyEntries(metadata);

  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Supplies</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {supplies.map((supply) => {
          const stateLabel =
            supply.available === null ? 'Unknown' : supply.available ? 'Yes' : 'No';

          return (
            <View
              className={[
                'rounded-full border px-3 py-1.5',
                supply.available === null
                  ? 'border-surface-strong bg-surface-base'
                  : supply.available
                    ? 'border-success/20 bg-success/10'
                    : 'border-warning/20 bg-warning/10',
              ].join(' ')}
              key={supply.label}
            >
              <Text
                className={[
                  'text-xs font-semibold',
                  supply.available === null
                    ? 'text-ink-600'
                    : supply.available
                      ? 'text-success'
                      : 'text-warning',
                ].join(' ')}
              >
                {supply.label}: {stateLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const BathroomSuppliesRow = memo(BathroomSuppliesRowComponent);
