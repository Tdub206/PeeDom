import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface BusinessSectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
}

function BusinessSectionHeaderComponent({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  iconName,
}: BusinessSectionHeaderProps) {
  return (
    <View className="mb-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-start gap-3">
          {iconName ? (
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Ionicons name={iconName} size={18} color={colors.brand[600]} />
            </View>
          ) : null}
          <View className="flex-1">
            {eyebrow ? (
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
                {eyebrow}
              </Text>
            ) : null}
            <Text className="mt-0.5 text-xl font-black tracking-tight text-ink-900">
              {title}
            </Text>
            {description ? (
              <Text className="mt-1 text-sm leading-5 text-ink-600">{description}</Text>
            ) : null}
          </View>
        </View>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
            onPress={onAction}
            className="rounded-full bg-brand-50 px-3 py-2"
          >
            <Text className="text-xs font-bold uppercase tracking-[1px] text-brand-700">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const BusinessSectionHeader = memo(BusinessSectionHeaderComponent);
