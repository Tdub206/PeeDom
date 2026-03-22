import React, { memo } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text } from 'react-native';
import { colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const BUTTON_VARIANT_CLASSNAMES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 border border-brand-700',
  secondary: 'bg-surface-card border border-surface-strong',
  ghost: 'bg-transparent border border-transparent',
  destructive: 'bg-danger border border-danger',
};

const LABEL_VARIANT_CLASSNAMES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-900',
  ghost: 'text-brand-700',
  destructive: 'text-white',
};

const SIZE_CLASSNAMES: Record<ButtonSize, string> = {
  md: 'min-h-[52px] px-4 py-3',
  lg: 'min-h-[56px] px-5 py-4',
};

const SPINNER_COLORS: Record<ButtonVariant, string> = {
  primary: colors.surface.card,
  secondary: colors.brand[600],
  ghost: colors.brand[700],
  destructive: colors.surface.card,
};

function ButtonComponent({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  className = '',
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className={[
        'items-center justify-center rounded-2xl',
        BUTTON_VARIANT_CLASSNAMES[variant],
        SIZE_CLASSNAMES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLORS[variant]} />
      ) : (
        <Text className={['text-base font-semibold', LABEL_VARIANT_CLASSNAMES[variant]].join(' ')}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export const Button = memo(ButtonComponent);
