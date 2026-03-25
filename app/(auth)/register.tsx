import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '@/api/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/useToast';
import { replaceSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';
import { FieldErrors, RegisterFormValues, getFieldErrors, registerSchema } from '@/utils/validate';

export default function RegisterScreen() {
  const router = useRouter();
  const { consumeReturnIntent } = useAuth();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState<RegisterFormValues>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof RegisterFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setSubmitError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const validationResult = registerSchema.safeParse(formValues);

    if (!validationResult.success) {
      const nextFieldErrors = getFieldErrors(validationResult.error);
      const message = getErrorMessage(validationResult.error, 'Fix the highlighted fields and try again.');

      setFieldErrors(nextFieldErrors);
      setSubmitError(message);
      void trackAnalyticsEvent('auth_sign_up_failed', {
        failure_source: 'validation',
      });
      showToast({
        title: 'Check your entries',
        message,
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await signUpWithEmail({
        displayName: validationResult.data.displayName,
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      if (result.error) {
        const message = getErrorMessage(result.error, 'Unable to create your account right now.');
        setSubmitError(message);
        void trackAnalyticsEvent('auth_sign_up_failed', {
          failure_source: 'supabase',
        });
        showToast({
          title: 'Account creation failed',
          message,
          variant: 'error',
        });
        return;
      }

      if (result.data.session) {
        showToast({
          title: 'Account created',
          message: 'You are signed in and ready to start using Pee-Dom.',
          variant: 'success',
        });
        const nextIntent = consumeReturnIntent();
        void trackAnalyticsEvent('auth_sign_up_succeeded', {
          has_return_intent: Boolean(nextIntent),
          requires_email_confirmation: false,
        });
        replaceSafely(router, nextIntent?.route ?? routes.tabs.profile, routes.tabs.profile);
        return;
      }

      void trackAnalyticsEvent('auth_sign_up_succeeded', {
        has_return_intent: false,
        requires_email_confirmation: true,
      });
      showToast({
        title: 'Check your inbox',
        message: 'We sent a confirmation email. Once you verify it, sign in to continue.',
        variant: 'success',
      });
      replaceSafely(router, routes.auth.login, routes.auth.login);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create your account right now.');
      setSubmitError(message);
      void trackAnalyticsEvent('auth_sign_up_failed', {
        failure_source: 'exception',
      });
      showToast({
        title: 'Account creation failed',
        message,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [consumeReturnIntent, formValues, isSubmitting, router, showToast]);

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="always" className="flex-1">
          <View className="flex-1 px-6 py-8">
            <View className="rounded-[32px] bg-ink-900 px-6 py-8">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">
                Launch Readiness
              </Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Create your account.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Join the community to favorite reliable bathrooms, verify codes, and report issues in real time.
              </Text>
            </View>

            <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
              <Input
                autoCapitalize="words"
                autoComplete="name"
                label="Display Name"
                onChangeText={(value) => updateField('displayName', value)}
                placeholder="Your name"
                returnKeyType="next"
                textContentType="name"
                value={formValues.displayName}
                error={fieldErrors.displayName}
              />

              <Input
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={(value) => updateField('email', value)}
                placeholder="you@example.com"
                returnKeyType="next"
                textContentType="emailAddress"
                value={formValues.email}
                error={fieldErrors.email}
                containerClassName="mt-5"
              />

              <Input
                allowPasswordToggle
                autoCapitalize="none"
                autoComplete="new-password"
                label="Password"
                onChangeText={(value) => updateField('password', value)}
                placeholder="At least 8 characters"
                secureTextEntry
                textContentType="newPassword"
                value={formValues.password}
                error={fieldErrors.password}
                containerClassName="mt-5"
              />

              <Input
                allowPasswordToggle
                autoCapitalize="none"
                autoComplete="new-password"
                label="Confirm Password"
                onChangeText={(value) => updateField('confirmPassword', value)}
                placeholder="Re-enter your password"
                secureTextEntry
                textContentType="password"
                value={formValues.confirmPassword}
                error={fieldErrors.confirmPassword}
                containerClassName="mt-5"
              />

              {submitError ? (
                <Text className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                  {submitError}
                </Text>
              ) : null}

              <Button
                className="mt-6"
                label="Create Account"
                loading={isSubmitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />

              <Pressable
                accessibilityRole="button"
                className="mt-5 items-center"
                onPress={() => replaceSafely(router, routes.auth.login, routes.auth.login)}
              >
                <Text className="text-sm font-medium text-ink-600">
                  Already registered? <Text className="text-brand-700">Sign in instead</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
