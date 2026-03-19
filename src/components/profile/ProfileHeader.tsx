import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { colors } from '@/constants/colors';
import { useProfileDisplayName } from '@/hooks/useProfileSettings';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { UserProfile } from '@/types';
import { getProfileInitials, getProfileLevelSummary } from '@/utils/profile';

interface ProfileHeaderProps {
  profile: UserProfile;
}

function getDisplayNameErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case 'name_too_short':
      return 'Display name must be at least 2 characters.';
    case 'name_too_long':
      return 'Display name must be 50 characters or fewer.';
    case 'not_authenticated':
      return 'Sign in again before updating your display name.';
    default:
      return 'Unable to update your display name right now.';
  }
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const updateDisplayName = useProfileDisplayName();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.display_name ?? '');
  const [inputError, setInputError] = useState<string | undefined>();
  const initials = useMemo(() => getProfileInitials(profile), [profile]);
  const levelSummary = useMemo(() => getProfileLevelSummary(profile.points_balance), [profile.points_balance]);
  const premiumActive = hasActivePremium(profile);
  const streakMultiplierActive = Boolean(
    profile.streak_multiplier > 1 &&
      profile.streak_multiplier_expires_at &&
      new Date(profile.streak_multiplier_expires_at).getTime() > Date.now()
  );

  useEffect(() => {
    if (!isEditing) {
      setDraftName(profile.display_name ?? '');
      setInputError(undefined);
    }
  }, [isEditing, profile.display_name]);

  const handleSaveName = useCallback(async () => {
    const trimmedName = draftName.trim();

    if (trimmedName.length < 2) {
      setInputError('Display name must be at least 2 characters.');
      return;
    }

    if (trimmedName.length > 50) {
      setInputError('Display name must be 50 characters or fewer.');
      return;
    }

    try {
      const result = await updateDisplayName.mutateAsync(trimmedName);

      if (!result.success) {
        const errorMessage = getDisplayNameErrorMessage(result.error);
        setInputError(errorMessage);
        showToast({
          title: 'Display name update failed',
          message: errorMessage,
          variant: 'error',
        });
        return;
      }

      setInputError(undefined);
      setIsEditing(false);
      showToast({
        title: 'Display name updated',
        message: 'Your profile name is now up to date.',
        variant: 'success',
      });
    } catch {
      // The mutation hook already provides the failure toast.
    }
  }, [draftName, showToast, updateDisplayName]);

  return (
    <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
      <View className="flex-row items-start gap-4">
        <View className="relative">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-600">
            <Text className="text-2xl font-black text-white">{initials}</Text>
          </View>
          {premiumActive ? (
            <View className="absolute -bottom-1 -right-1 rounded-full bg-warning px-2.5 py-1">
              <Text className="text-[10px] font-black uppercase tracking-[0.75px] text-white">Premium</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Profile</Text>

          {isEditing ? (
            <View className="mt-3">
              <Input
                autoCapitalize="words"
                autoCorrect={false}
                containerClassName="gap-3"
                error={inputError}
                label="Display Name"
                maxLength={50}
                onChangeText={(value) => {
                  setDraftName(value);
                  if (inputError) {
                    setInputError(undefined);
                  }
                }}
                onSubmitEditing={() => {
                  void handleSaveName();
                }}
                returnKeyType="done"
                value={draftName}
              />
              <View className="mt-3 flex-row gap-3">
                <Button
                  fullWidth={false}
                  label="Save"
                  loading={updateDisplayName.isPending}
                  onPress={() => {
                    void handleSaveName();
                  }}
                  size="md"
                />
                <Button
                  fullWidth={false}
                  label="Cancel"
                  onPress={() => {
                    setDraftName(profile.display_name ?? '');
                    setInputError(undefined);
                    setIsEditing(false);
                  }}
                  size="md"
                  variant="ghost"
                />
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="mt-3 flex-row items-center gap-2"
              onPress={() => setIsEditing(true)}
            >
              <Text className="text-2xl font-black text-ink-900">
                {profile.display_name?.trim() || 'Set your display name'}
              </Text>
              <Ionicons color={colors.ink[500]} name="create-outline" size={18} />
            </Pressable>
          )}

          <Text className="mt-2 text-sm leading-6 text-ink-600">{profile.email ?? 'Email unavailable'}</Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-surface-muted px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-ink-700">
                {profile.role === 'user' ? 'Community member' : profile.role}
              </Text>
            </View>
            <View className="rounded-full bg-brand-50 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-brand-700">
                {profile.current_streak} day streak
              </Text>
            </View>
            {streakMultiplierActive ? (
              <View className="rounded-full bg-success/10 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-success">
                  {profile.streak_multiplier}x multiplier active
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-6 rounded-[28px] bg-brand-600 px-5 py-5">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/75">Level progress</Text>
        <Text className="mt-3 text-3xl font-black text-white">{levelSummary.label}</Text>
        <Text className="mt-2 text-sm leading-6 text-white/80">{levelSummary.supportingCopy}</Text>
        <View className="mt-5 h-3 rounded-full bg-white/15">
          <View
            className="h-3 rounded-full bg-white"
            style={{ width: `${Math.max(4, levelSummary.progressPercent)}%` }}
          />
        </View>
        <Text className="mt-3 text-sm text-white/70">Longest streak: {profile.longest_streak} days</Text>
      </View>
    </View>
  );
}
