import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BathroomAccessibilityDetails as BathroomAccessibilityDetailsRecord } from '@/types';

interface BathroomAccessibilityDetailsProps {
  details: BathroomAccessibilityDetailsRecord | null;
}

function formatOptionalInches(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Unknown';
  }

  return `${value.toFixed(1)} in`;
}

function toStatusLabel(value: boolean | null): string {
  if (value === null) {
    return 'Unknown';
  }

  return value ? 'Yes' : 'No';
}

function BathroomAccessibilityDetailsComponent({ details }: BathroomAccessibilityDetailsProps) {
  const rows = [
    { label: 'Wheelchair accessible', value: toStatusLabel(details?.wheelchair_accessible ?? null) },
    { label: 'Door clear width', value: formatOptionalInches(details?.door_clear_width_inches ?? null) },
    { label: 'Turning space', value: formatOptionalInches(details?.turning_space_inches ?? null) },
    { label: 'Stall width', value: formatOptionalInches(details?.stall_width_inches ?? null) },
    { label: 'Stall depth', value: formatOptionalInches(details?.stall_depth_inches ?? null) },
    { label: 'Grab bars', value: toStatusLabel(details?.has_grab_bars ?? null) },
    { label: 'Accessible sink', value: toStatusLabel(details?.has_accessible_sink ?? null) },
    { label: 'Step-free access', value: toStatusLabel(details?.has_step_free_access ?? null) },
    { label: 'Power door', value: toStatusLabel(details?.has_power_door ?? null) },
  ];

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Accessibility details</Text>
      <View className="mt-4 gap-3">
        {rows.map((row) => (
          <View className="flex-row items-start justify-between gap-4" key={row.label}>
            <Text className="flex-1 text-sm font-semibold text-ink-700">{row.label}</Text>
            <Text className="text-sm text-ink-900">{row.value}</Text>
          </View>
        ))}
      </View>
      {details?.notes ? (
        <View className="mt-4 rounded-2xl bg-surface-base px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Notes</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-700">{details.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export const BathroomAccessibilityDetails = memo(BathroomAccessibilityDetailsComponent);
