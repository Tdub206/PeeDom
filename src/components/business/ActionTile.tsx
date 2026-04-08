import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type ActionTileTone = 'brand' | 'neutral' | 'success' | 'warning';

interface ActionTileProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: ActionTileTone;
  badge?: string | number;
  disabled?: boolean;
}

const TONE_CARD: Record<ActionTileTone, string> = {
  brand: 'border-brand-100 bg-brand-50',
  neutral: 'border-surface-strong bg-surface-card',
  success: 'border-success/20 bg-success/10',
  warning: 'border-warning/20 bg-warning/10',
};

const TONE_ICON_BG: Record<ActionTileTone, string> = {
  brand: 'bg-brand-600',
  neutral: 'bg-ink-900',
  success: 'bg-success',
  warning: 'bg-warning',
};

const TONE_TITLE: Record<ActionTileTone, string> = {
  brand: 'text-brand-900',
  neutral: 'text-ink-900',
  success: 'text-success',
  warning: 'text-warning',
};

function ActionTileComponent({
  iconName,
  title,
  subtitle,
  onPress,
  tone = 'neutral',
  badge,
  disabled = false,
}: ActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      className={[
        'flex-1 rounded-[24px] border p-4',
        TONE_CARD[tone],
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <View className="flex-row items-start justify-between">
        <View
          className={[
            'h-11 w-11 items-center justify-center rounded-2xl',
            TONE_ICON_BG[tone],
          ].join(' ')}
        >
          <Ionicons name={iconName} size={22} color={colors.surface.card} />
        </View>
        {badge !== undefined && badge !== null && badge !== '' ? (
          <View className="rounded-full bg-white px-2.5 py-1">
            <Text className="text-[11px] font-black uppercase tracking-[1px] text-ink-900">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className={['mt-4 text-base font-bold', TONE_TITLE[tone]].join(' ')}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-xs leading-5 text-ink-600">{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

export const ActionTile = memo(ActionTileComponent);
