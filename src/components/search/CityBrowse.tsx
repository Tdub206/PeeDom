import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCityBrowse } from '@/hooks/useSearch';
import { colors } from '@/constants/colors';

interface CityBrowseProps {
  onSelect: (city: string, state: string) => void;
}

function CityBrowseComponent({ onSelect }: CityBrowseProps) {
  const cityBrowseQuery = useCityBrowse();
  const cities = cityBrowseQuery.data ?? [];

  if (cityBrowseQuery.isLoading) {
    return (
      <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={colors.brand[600]} size="small" />
          <Text className="text-sm font-semibold text-ink-700">Loading top cities</Text>
        </View>
      </View>
    );
  }

  if (cityBrowseQuery.error || !cities.length) {
    return null;
  }

  return (
    <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Browse by city</Text>
      <Text className="mt-2 text-xl font-black text-ink-900">Jump into the busiest bathroom pockets.</Text>

      <View className="mt-4 gap-3">
        {cities.map((cityItem) => (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-4 rounded-[24px] bg-surface-base px-4 py-4"
            key={`${cityItem.city}-${cityItem.state}`}
            onPress={() => onSelect(cityItem.city, cityItem.state)}
          >
            <Ionicons color={colors.brand[600]} name="business-outline" size={22} />
            <View className="flex-1">
              <Text className="text-base font-black text-ink-900">
                {cityItem.city}, {cityItem.state}
              </Text>
              <Text className="mt-1 text-sm text-ink-600">
                {cityItem.bathroom_count.toLocaleString()} bathrooms
              </Text>
            </View>
            <Text className="text-base font-semibold text-brand-700">Search</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const CityBrowse = memo(CityBrowseComponent);
