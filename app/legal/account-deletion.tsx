import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { deleteCurrentAccount } from '@/api/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { replaceSafely } from '@/lib/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errorMap';
import { accountDeletionSchema, getFieldErrors, type FieldErrors } from '@/utils/validate';

interface AccountDeletionFormState {
  confirmation: string;
}

export default function AccountDeletionScreen() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState<AccountDeletionFormState>({
    confirmation: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<AccountDeletionFormState>>({});
  const [submitError, setSubmitError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const updateConfirmation = useCallback((value: string) => {
    setFormValues({
      confirmation: value,
    });
    setFieldErrors({});
    setSubmitError('');
  }, []);

  const performDeletion = useCallback(async () => {
    if (!user) {
      replaceSafely(router, routes.auth.login, routes.auth.login);
      return;
    }

    setIsDeleting(true);
    setSubmitError('');

    try {
      const deletionResult = await deleteCurrentAccount();

      if (deletionResult.error) {
        throw deletionResult.error;
      }

      const { error: localSignOutError } = await getSupabaseClient().auth.signOut({
        scope: 'local',
      });

      if (localSignOutError) {
        console.error('Unable to clear the local session after deleting the account:', localSignOutError);
      }

      await refreshUser();

      showToast({
        title: 'Account deleted',
        message:
          deletionResult.warning ??
          'Your Pee-Dom account and synced user data have been removed from this device and backend.',
        variant: deletionResult.warning ? 'warning' : 'success',
      });
      replaceSafely(router, routes.tabs.map, routes.tabs.map);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to delete your account right now.');
      setSubmitError(message);
      showToast({
        title: 'Account deletion failed',
        message,
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [refreshUser, router, showToast, user]);

  const handleDeleteAccount = useCallback(async () => {
    const validationResult = accountDeletionSchema.safeParse(formValues);

    if (!validationResult.success) {
      const nextFieldErrors = getFieldErrors(validationResult.error);
      const message = getErrorMessage(validationResult.error, 'Type DELETE to confirm account deletion.');

      setFieldErrors(nextFieldErrors);
      setSubmitError(message);
      showToast({
        title: 'Confirmation required',
        message,
        variant: 'warning',
      });
      return;
    }

    Alert.alert(
      'Delete account permanently?',
      'This removes your Pee-Dom account, favorites, reports, ratings, claims, and uploaded photo metadata. Bathrooms you added can remain on the map anonymously.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            void performDeletion();
          },
        },
      ]
    );
  }, [formValues, performDeletion, showToast]);

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" className="flex-1">
          <View className="px-6 py-8">
            <View className="rounded-[32px] bg-danger px-6 py-8">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Account Deletion</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Delete your Pee-Dom account.</Text>
              <Text className="mt-3 text-base leading-6 text-white/85">
                This screen is intended for both in-app deletion and public web publication so account deletion instructions stay accessible outside the mobile app.
              </Text>
            </View>

            <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">What Gets Removed</Text>
              <Text className="mt-4 text-base leading-7 text-ink-700">
                Your account profile, favorites, reports, ratings, claims, uploaded bathroom photo metadata, and active sessions are removed when deletion succeeds.
              </Text>
              <Text className="mt-3 text-base leading-7 text-ink-700">
                Bathrooms you personally submitted can remain in the community database, but their authorship is cleared so they are no longer tied to your identity.
              </Text>
            </View>

            {!user ? (
              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-2xl font-bold text-ink-900">Sign in to continue.</Text>
                <Text className="mt-3 text-base leading-7 text-ink-700">
                  You must be authenticated to delete the current Pee-Dom account. If you are viewing this page on the web, sign in there or from the mobile app and return to this screen.
                </Text>
                <View className="mt-6 gap-3">
                  <Button
                    label="Sign In"
                    onPress={() => replaceSafely(router, routes.auth.login, routes.auth.login)}
                  />
                  <Button
                    label="Read Privacy Policy"
                    onPress={() => replaceSafely(router, routes.legal.privacy, routes.legal.privacy)}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : (
              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Confirm Deletion</Text>
                <Text className="mt-3 text-base leading-7 text-ink-700">
                  Signed in as {user.email ?? 'your account'}. Type DELETE to confirm permanent account deletion.
                </Text>

                <Input
                  autoCapitalize="characters"
                  autoCorrect={false}
                  containerClassName="mt-6"
                  label="Confirmation"
                  maxLength={6}
                  onChangeText={updateConfirmation}
                  placeholder="DELETE"
                  returnKeyType="done"
                  value={formValues.confirmation}
                  error={fieldErrors.confirmation}
                />

                {submitError ? (
                  <Text className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</Text>
                ) : null}

                <View className="mt-6 gap-3">
                  <Button
                    label="Delete Account Permanently"
                    loading={isDeleting}
                    onPress={() => {
                      void handleDeleteAccount();
                    }}
                    variant="destructive"
                  />
                  <Button
                    label="Read Privacy Policy"
                    onPress={() => replaceSafely(router, routes.legal.privacy, routes.legal.privacy)}
                    variant="secondary"
                  />
                  <Button
                    label="Back To Profile"
                    onPress={() => replaceSafely(router, routes.tabs.profile, routes.tabs.profile)}
                    variant="ghost"
                  />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
