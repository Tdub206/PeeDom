import React, { forwardRef, memo, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  inputClassName?: string;
  allowPasswordToggle?: boolean;
}

const InputComponent = forwardRef<TextInput, InputProps>(function InputComponent(
  {
    label,
    error,
    helperText,
    containerClassName = '',
    inputClassName = '',
    secureTextEntry,
    allowPasswordToggle = false,
    editable = true,
    ...props
  },
  ref
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const canTogglePassword = allowPasswordToggle && secureTextEntry;
  const shouldHideText = secureTextEntry && !isPasswordVisible;

  return (
    <View className={['gap-2', containerClassName].filter(Boolean).join(' ')}>
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <View
        className={[
          'min-h-[56px] flex-row items-center rounded-2xl border bg-surface-card px-4',
          error ? 'border-danger' : 'border-surface-strong',
          !editable ? 'opacity-60' : '',
        ].join(' ')}
      >
        <TextInput
          ref={ref}
          className={['flex-1 py-4 text-base text-ink-900', inputClassName].filter(Boolean).join(' ')}
          editable={editable}
          placeholderTextColor={colors.ink[400]}
          secureTextEntry={shouldHideText}
          {...props}
        />
        {canTogglePassword ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
            className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
          >
            <Ionicons
              color={colors.ink[600]}
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      {!error && helperText ? <Text className="text-sm text-ink-500">{helperText}</Text> : null}
    </View>
  );
});

export const Input = memo(InputComponent);
