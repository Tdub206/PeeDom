import { memo, useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

interface FreeMapToggleProps {
  bathroomId: string;
  initialValue: boolean;
  isLoading?: boolean;
  onToggle: (bathroomId: string, showOnFreeMap: boolean) => void;
}

function FreeMapToggleComponent({ bathroomId, initialValue, isLoading, onToggle }: FreeMapToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialValue);

  const handleToggle = useCallback(
    (value: boolean) => {
      setIsEnabled(value);
      onToggle(bathroomId, value);
    },
    [bathroomId, onToggle]
  );

  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-ink-900">Show on Free Map</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">
            {isEnabled
              ? 'Your bathroom is visible to all StallPass users.'
              : 'Your bathroom only appears for Premium users.'}
          </Text>
        </View>
        <Switch
          disabled={isLoading}
          onValueChange={handleToggle}
          thumbColor="#ffffff"
          trackColor={{ false: '#cbd5e1', true: colors.brand[600] }}
          value={isEnabled}
        />
      </View>
    </View>
  );
}

export const FreeMapToggle = memo(FreeMapToggleComponent);
