import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HoursSourceType } from '@/types';

interface HoursPresetPickerProps {
  selectedSource: HoursSourceType;
  selectedOffset: number | null;
  onSelectSource: (source: HoursSourceType, offsetMinutes: number | null) => void;
}

interface PresetOption {
  label: string;
  source: HoursSourceType;
  offset: number | null;
  description: string;
}

const PRESETS: PresetOption[] = [
  {
    label: 'Custom Hours',
    source: 'manual',
    offset: null,
    description: 'Set your own bathroom hours for each day.',
  },
  {
    label: 'Google Business Hours',
    source: 'google',
    offset: null,
    description: 'Auto-fill from your Google Business Profile.',
  },
  {
    label: '30 Min Before Close',
    source: 'preset_offset',
    offset: -30,
    description: 'Bathroom closes 30 minutes before your business.',
  },
  {
    label: '1 Hour Before Close',
    source: 'preset_offset',
    offset: -60,
    description: 'Bathroom closes 1 hour before your business.',
  },
];

function HoursPresetPickerComponent({
  selectedSource,
  selectedOffset,
  onSelectSource,
}: HoursPresetPickerProps) {
  const isSelected = useCallback(
    (preset: PresetOption) => {
      if (preset.source !== selectedSource) return false;
      if (preset.source === 'preset_offset') return preset.offset === selectedOffset;
      return true;
    },
    [selectedSource, selectedOffset]
  );

  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
        Hours Mode
      </Text>
      <View className="mt-2 gap-2">
        {PRESETS.map((preset) => {
          const active = isSelected(preset);
          return (
            <Pressable
              key={`${preset.source}-${preset.offset}`}
              onPress={() => onSelectSource(preset.source, preset.offset)}
            >
              <View
                className={[
                  'rounded-2xl border p-4',
                  active
                    ? 'border-brand-600 bg-brand-600/5'
                    : 'border-surface-strong bg-surface-card',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-base font-semibold',
                    active ? 'text-brand-600' : 'text-ink-900',
                  ].join(' ')}
                >
                  {preset.label}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-600">{preset.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const HoursPresetPicker = memo(HoursPresetPickerComponent);
