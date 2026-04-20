import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '@/constants/colors';

interface BathroomOriginBadgeProps {
  label: string;
}

function BathroomOriginBadgeComponent({ label }: BathroomOriginBadgeProps) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5">
      <Ionicons color={colors.brand[700]} name="sparkles-outline" size={12} />
      <Text className="text-[11px] font-black uppercase tracking-[0.9px] text-brand-700">{label}</Text>
    </View>
  );
}

export const BathroomOriginBadge = memo(BathroomOriginBadgeComponent);
