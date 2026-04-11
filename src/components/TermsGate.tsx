import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routes } from '@/constants/routes';
import { pushSafely } from '@/lib/navigation';

interface TermsGateProps {
  /** Whether the user has already accepted terms (null = still loading). */
  hasAccepted: boolean | null;
  /** Called when the user taps the checkbox to accept. */
  onAccept: () => void;
  /** Fallback route when navigation fails. */
  fallbackRoute?: string;
}

/**
 * Inline terms-acceptance checkbox shown before UGC submission.
 * Renders nothing if the user has already accepted or acceptance state is loading.
 */
export const TermsGate = memo(function TermsGate({ hasAccepted, onAccept, fallbackRoute }: TermsGateProps) {
  const router = useRouter();
  const fallback = (fallbackRoute ?? '/') as Href;

  if (hasAccepted === null || hasAccepted) {
    return null;
  }

  return (
    <View className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false }}
        className="flex-row items-start gap-3"
        onPress={onAccept}
      >
        <View className="mt-0.5 h-5 w-5 items-center justify-center rounded border border-ink-300 bg-white">
          <Ionicons name="checkmark" size={14} color="transparent" />
        </View>
        <View className="flex-1">
          <Text className="text-sm leading-5 text-ink-700">
            I agree to the{' '}
            <Text
              className="font-semibold text-brand-700"
              onPress={() => pushSafely(router, routes.modal.legalTerms, fallback)}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              className="font-semibold text-brand-700"
              onPress={() => pushSafely(router, routes.modal.legalPrivacy, fallback)}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </Pressable>
    </View>
  );
});
