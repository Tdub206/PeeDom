import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastMessage, ToastVariant } from '@/types';

interface ToastInput {
  title: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  hideToast: (toastId: string) => void;
  hideAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_VARIANTS: Record<ToastVariant, { container: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: {
    container: 'border-success/20 bg-success/10',
    icon: 'checkmark-circle',
  },
  error: {
    container: 'border-danger/20 bg-danger/10',
    icon: 'alert-circle',
  },
  info: {
    container: 'border-brand-200 bg-brand-50',
    icon: 'information-circle',
  },
  warning: {
    container: 'border-warning/20 bg-warning/10',
    icon: 'warning',
  },
};

function buildToast(input: ToastInput): ToastMessage {
  return {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    title: input.title,
    message: input.message,
    variant: input.variant ?? 'info',
    duration: input.duration ?? 4000,
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const insets = useSafeAreaInsets();

  const hideToast = useCallback((toastId: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));

    const timer = timers.current[toastId];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[toastId];
    }
  }, []);

  const hideAll = useCallback(() => {
    Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    timers.current = {};
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (input: ToastInput): string => {
      const toast = buildToast(input);

      setToasts((currentToasts) => [...currentToasts.slice(-2), toast]);

      timers.current[toast.id] = setTimeout(() => {
        hideToast(toast.id);
      }, toast.duration);

      return toast.id;
    },
    [hideToast]
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, hideAll }}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 z-50 px-4"
        style={{ top: insets.top + 12 }}
      >
        {toasts.map((toast) => {
          const variant = TOAST_VARIANTS[toast.variant];

          return (
            <Pressable
              accessibilityRole="button"
              key={toast.id}
              onPress={() => hideToast(toast.id)}
              className={[
                'mb-3 flex-row items-start gap-3 rounded-3xl border px-4 py-4 shadow-sm',
                variant.container,
              ].join(' ')}
            >
              <View className="mt-0.5">
                <Ionicons color="#1f2937" name={variant.icon} size={20} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-ink-900">{toast.title}</Text>
                <Text className="text-sm leading-5 text-ink-700">{toast.message}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider.');
  }

  return context;
}
