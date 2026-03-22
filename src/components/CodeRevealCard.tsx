import React, { memo, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';

interface CodeRevealCardProps {
  hasCode: boolean;
  codeValue: string | null;
  confidenceScore: number | null;
  lastVerifiedAt?: string | null;
  expiresAt?: string | null;
  isLoadingCode: boolean;
  isUnlockingWithAd: boolean;
  isPremiumUser: boolean;
  requiresAuthForUnlock?: boolean;
  isRewardedUnlockActive: boolean;
  isAdUnlockAvailable: boolean;
  unavailableReason?: string | null;
  issueMessage?: string | null;
  onUnlockWithAd: () => void;
}

function formatTimestamp(label: string, value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return `${label}: ${parsedDate.toLocaleString()}`;
}

function CodeRevealCardComponent({
  hasCode,
  codeValue,
  confidenceScore,
  lastVerifiedAt,
  expiresAt,
  isLoadingCode,
  isUnlockingWithAd,
  isPremiumUser,
  requiresAuthForUnlock = false,
  isRewardedUnlockActive,
  isAdUnlockAvailable,
  unavailableReason,
  issueMessage,
  onUnlockWithAd,
}: CodeRevealCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    if (!codeValue) return;
    try {
      await Clipboard.setStringAsync(codeValue);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — clipboard may be unavailable on some devices
    }
  }, [codeValue]);

  const confidenceLabel =
    typeof confidenceScore === 'number' ? `${Math.max(0, Math.min(100, Math.round(confidenceScore)))}% confidence` : 'Confidence unavailable';
  const verificationLabel = formatTimestamp('Last verified', lastVerifiedAt);
  const expiryLabel = formatTimestamp('Code expires', expiresAt);
  const isRevealPending = isRewardedUnlockActive || isLoadingCode;

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Access Code</Text>

      {!hasCode ? (
        <>
          <Text className="mt-3 text-2xl font-bold text-ink-900">No code submitted yet</Text>
          <Text className="mt-2 text-base leading-6 text-ink-600">
            Nobody has shared a verified code for this bathroom yet. You can still use the summary above to judge how recently the community has checked this spot.
          </Text>
        </>
      ) : codeValue ? (
        <>
          <Text className="mt-3 text-2xl font-bold text-ink-900">Community code</Text>
          <View className="mt-4 flex-row items-center rounded-3xl bg-ink-900 px-5 py-5">
            <Text className="flex-1 text-center text-4xl font-black tracking-[6px] text-white">{codeValue}</Text>
            <Pressable
              accessibilityLabel={copied ? 'Code copied' : 'Copy code to clipboard'}
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleCopyCode}
              className="ml-3 items-center justify-center rounded-2xl bg-white/15 px-3 py-3"
            >
              <Ionicons color="#ffffff" name={copied ? 'checkmark-circle' : 'copy-outline'} size={22} />
              {copied ? <Text className="mt-1 text-[10px] font-semibold text-white">Copied!</Text> : null}
            </Pressable>
          </View>
          <Text className="mt-3 text-sm leading-5 text-ink-600">
            {isPremiumUser
              ? 'Premium access revealed this code instantly.'
              : 'This code is unlocked on this device because you completed a rewarded ad.'}
          </Text>
        </>
      ) : (
        <>
          <Text className="mt-3 text-2xl font-bold text-ink-900">Locked until revealed</Text>
          <View className="mt-4 rounded-3xl border border-dashed border-surface-strong bg-surface-muted px-5 py-5">
            <Text className="text-center text-4xl font-black tracking-[6px] text-ink-400">******</Text>
          </View>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            {isPremiumUser
              ? 'Premium accounts can reveal verified bathroom codes instantly.'
              : requiresAuthForUnlock
                ? 'Sign in and watch a rewarded ad to reveal the latest verified bathroom code for your account.'
                : 'Watch a rewarded AdMob ad to reveal the latest verified bathroom code for your account.'}
          </Text>

          {!isPremiumUser ? (
            <Button
              className="mt-4"
              disabled={!isAdUnlockAvailable || isRevealPending}
              label={
                isUnlockingWithAd
                  ? 'Loading Rewarded Ad...'
                  : isRevealPending
                    ? 'Revealing Code...'
                    : requiresAuthForUnlock
                      ? 'Sign In To Reveal Code'
                      : 'Watch Ad To Reveal Code'
              }
              loading={isUnlockingWithAd}
              onPress={onUnlockWithAd}
            />
          ) : null}

          {!isPremiumUser && !isAdUnlockAvailable && unavailableReason ? (
            <Text className="mt-3 text-sm leading-5 text-warning">{unavailableReason}</Text>
          ) : null}

          {isRewardedUnlockActive && !codeValue ? (
            <Text className="mt-3 text-sm leading-5 text-brand-700">
              Your rewarded unlock is active. Loading the current community code now.
            </Text>
          ) : null}

          {issueMessage ? (
            <Text className="mt-3 text-sm leading-5 text-danger">{issueMessage}</Text>
          ) : null}
        </>
      )}

      {hasCode ? (
        <View className="mt-4 gap-2 rounded-2xl bg-surface-muted px-4 py-4">
          <Text className="text-sm font-medium text-ink-700">{confidenceLabel}</Text>
          {verificationLabel ? <Text className="text-sm text-ink-600">{verificationLabel}</Text> : null}
          {expiryLabel ? <Text className="text-sm text-ink-600">{expiryLabel}</Text> : null}
          {isLoadingCode ? (
            <Text className="text-sm text-brand-700">Refreshing the latest verified code...</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const CodeRevealCard = memo(CodeRevealCardComponent);
