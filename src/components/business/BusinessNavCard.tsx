import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface BusinessNavCardProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  badge?: string | number;
  badgeTone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  disabled?: boolean;
}

const BADGE_TONE: Record<NonNullable<BusinessNavCardProps['badgeTone']>, string> = {
  brand: 'bg-brand-600 text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  neutral: 'bg-surface-base text-ink-700',
};

function BusinessNavCardComponent({
  iconName,
  title,
  description,
  onPress,
  badge,
  badgeTone = 'brand',
  disabled = false,
}: BusinessNavCardProps) {
  const badgeClasses = BADGE_TONE[badgeTone].split(' ');
  const badgeBg = badgeClasses[0];
  const badgeText = badgeClasses[1];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      className={[
        'flex-row items-center gap-4 rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
        <Ionicons name={iconName} size={22} color={colors.brand[600]} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-ink-900">{title}</Text>
          {badge !== undefined && badge !== null && badge !== '' ? (
            <View className={['rounded-full px-2 py-0.5', badgeBg].join(' ')}>
              <Text className={['text-[10px] font-black uppercase tracking-[1px]', badgeText].join(' ')}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-xs leading-5 text-ink-600">{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.ink[400]} />
    </Pressable>
  );
}

export const BusinessNavCard = memo(BusinessNavCardComponent);
