import { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { ProfileStat } from '@/utils/profile';

interface StatsGridProps {
  stats: ProfileStat[];
}

const STAT_ICONS: Record<ProfileStat['key'], keyof typeof Ionicons.glyphMap> = {
  points: 'star-outline',
  streak: 'flame-outline',
  bathrooms: 'business-outline',
  codes_submitted: 'key-outline',
  codes_verified: 'checkmark-done-outline',
  reports: 'alert-circle-outline',
  photos: 'image-outline',
  badges: 'ribbon-outline',
};

function StatsGridComponent({ stats }: StatsGridProps) {
  return (
    <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Contribution dashboard</Text>
      <View className="mt-5 flex-row flex-wrap justify-between gap-y-4">
        {stats.map((stat) => (
          <View className="w-[48%] rounded-[24px] bg-surface-base px-4 py-4" key={stat.key}>
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
              <Ionicons color={colors.brand[600]} name={STAT_ICONS[stat.key]} size={18} />
            </View>
            <Text className="mt-4 text-2xl font-black text-ink-900">{stat.value.toLocaleString()}</Text>
            <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.75px] text-ink-500">{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const StatsGrid = memo(StatsGridComponent);
