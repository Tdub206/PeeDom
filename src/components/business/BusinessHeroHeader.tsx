import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface BusinessHeroHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onBack?: () => void;
  variant?: 'primary' | 'dark' | 'gradient';
  rightSlot?: React.ReactNode;
}

const VARIANT_BG: Record<NonNullable<BusinessHeroHeaderProps['variant']>, string> = {
  primary: 'bg-brand-600',
  dark: 'bg-ink-900',
  gradient: 'bg-brand-700',
};

function BusinessHeroHeaderComponent({
  eyebrow,
  title,
  subtitle,
  iconName,
  onBack,
  variant = 'primary',
  rightSlot,
}: BusinessHeroHeaderProps) {
  return (
    <View className={['rounded-[32px] px-6 py-7', VARIANT_BG[variant]].join(' ')}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
          <Text className="text-xs font-bold uppercase tracking-[2px] text-white/80">
            {eyebrow}
          </Text>
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>

      <View className="mt-4 flex-row items-start gap-4">
        {iconName ? (
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name={iconName} size={28} color={colors.surface.card} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-3xl font-black tracking-tight text-white">{title}</Text>
          {subtitle ? (
            <Text className="mt-2 text-sm leading-6 text-white/85">{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const BusinessHeroHeader = memo(BusinessHeroHeaderComponent);
