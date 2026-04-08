import { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type QuickStatTone = 'default' | 'brand' | 'success' | 'warning' | 'danger';

interface QuickStatTileProps {
  label: string;
  value: string | number;
  helper?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: QuickStatTone;
  compact?: boolean;
}

const TONE_BG: Record<QuickStatTone, string> = {
  default: 'border-surface-strong bg-surface-card',
  brand: 'border-brand-100 bg-brand-50',
  success: 'border-success/20 bg-success/10',
  warning: 'border-warning/20 bg-warning/10',
  danger: 'border-danger/20 bg-danger/10',
};

const TONE_VALUE: Record<QuickStatTone, string> = {
  default: 'text-ink-900',
  brand: 'text-brand-700',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const TONE_ICON: Record<QuickStatTone, string> = {
  default: colors.ink[500],
  brand: colors.brand[600],
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

const TONE_ICON_BG: Record<QuickStatTone, string> = {
  default: 'bg-surface-base',
  brand: 'bg-white',
  success: 'bg-white',
  warning: 'bg-white',
  danger: 'bg-white',
};

function QuickStatTileComponent({
  label,
  value,
  helper,
  iconName,
  tone = 'default',
  compact = false,
}: QuickStatTileProps) {
  return (
    <View
      className={[
        'flex-1 rounded-[20px] border',
        compact ? 'px-4 py-3' : 'px-4 py-4',
        TONE_BG[tone],
      ].join(' ')}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
          {label}
        </Text>
        {iconName ? (
          <View
            className={[
              'h-7 w-7 items-center justify-center rounded-full',
              TONE_ICON_BG[tone],
            ].join(' ')}
          >
            <Ionicons name={iconName} size={14} color={TONE_ICON[tone]} />
          </View>
        ) : null}
      </View>
      <Text
        className={[
          'mt-2 font-black tracking-tight',
          compact ? 'text-2xl' : 'text-3xl',
          TONE_VALUE[tone],
        ].join(' ')}
      >
        {value}
      </Text>
      {helper ? (
        <Text className="mt-1 text-[11px] leading-4 text-ink-500">{helper}</Text>
      ) : null}
    </View>
  );
}

export const QuickStatTile = memo(QuickStatTileComponent);
