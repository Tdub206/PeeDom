import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmail } from '@/api/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { pushSafely, replaceSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';
import { FieldErrors, LoginFormValues, getFieldErrors, loginSchema } from '@/utils/validate';

export default function LoginScreen() {
  const router = useRouter();
  const { consumeReturnIntent } = useAuth();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof LoginFormValues, value: string) => {
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

    const validationResult = loginSchema.safeParse(formValues);

    if (!validationResult.success) {
      const nextFieldErrors = getFieldErrors(validationResult.error);
      const message = getErrorMessage(validationResult.error, 'Fix the highlighted fields and try again.');

      setFieldErrors(nextFieldErrors);
      setSubmitError(message);
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
      const result = await signInWithEmail(validationResult.data);

      if (result.error) {
        const message = getErrorMessage(result.error, 'Unable to sign in right now.');
        setSubmitError(message);
        showToast({
          title: 'Sign in failed',
          message,
          variant: 'error',
        });
        return;
      }

      showToast({
        title: 'Welcome back',
        message: 'Your account session has been restored.',
        variant: 'success',
      });

      const nextIntent = consumeReturnIntent();
      replaceSafely(router, nextIntent?.route ?? routes.tabs.profile, routes.tabs.profile);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to sign in right now.');
      setSubmitError(message);
      showToast({
        title: 'Sign in failed',
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
            <View className="rounded-[32px] bg-brand-600 px-6 py-8">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">
                Phase 3 Authentication
              </Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in fast.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Restore your Pee-Dom session to save favorites, submit codes, and manage reports.
              </Text>
            </View>

            <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
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
              />

              <Input
                allowPasswordToggle
                autoCapitalize="none"
                autoComplete="password"
                label="Password"
                onChangeText={(value) => updateField('password', value)}
                placeholder="Enter your password"
                secureTextEntry
                textContentType="password"
                value={formValues.password}
                error={fieldErrors.password}
                containerClassName="mt-5"
              />

              {submitError ? (
                <Text className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                  {submitError}
                </Text>
              ) : null}

              <Button
                className="mt-6"
                label="Sign In"
                loading={isSubmitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />

              <Pressable
                accessibilityRole="button"
                className="mt-5 items-center"
                onPress={() => pushSafely(router, routes.auth.register, routes.auth.register)}
              >
                <Text className="text-sm font-medium text-ink-600">
                  Need an account? <Text className="text-brand-700">Create one now</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
