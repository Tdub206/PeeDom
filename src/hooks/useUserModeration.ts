import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { blockUser, reportUser, unblockUser } from '@/api/user-moderation';
import { useToast } from '@/hooks/useToast';

type UserReportReason = 'spam' | 'harassment' | 'false_info' | 'impersonation' | 'inappropriate_content' | 'other';

export function useUserModeration() {
  const { showToast } = useToast();
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const handleReportUser = useCallback(
    async (userId: string, reason: UserReportReason, notes?: string) => {
      if (isReporting) return false;
      setIsReporting(true);

      try {
        const result = await reportUser(userId, reason, notes);

        if (!result.success) {
          const message =
            result.error === 'already_reported'
              ? 'You have already reported this user.'
              : result.error === 'cannot_report_self'
                ? 'You cannot report yourself.'
                : 'Unable to submit the report right now.';
          showToast({ title: 'Report not submitted', message, variant: 'warning' });
          return false;
        }

        showToast({
          title: 'Report submitted',
          message: 'Thank you. Our team will review this report.',
          variant: 'success',
        });
        return true;
      } catch {
        showToast({
          title: 'Report failed',
          message: 'Unable to submit the report right now.',
          variant: 'error',
        });
        return false;
      } finally {
        setIsReporting(false);
      }
    },
    [isReporting, showToast]
  );

  const handleBlockUser = useCallback(
    async (userId: string) => {
      if (isBlocking) return false;
      setIsBlocking(true);

      try {
        const result = await blockUser(userId);

        if (!result.success) {
          showToast({
            title: 'Block failed',
            message: result.error === 'cannot_block_self' ? 'You cannot block yourself.' : 'Unable to block this user right now.',
            variant: 'warning',
          });
          return false;
        }

        showToast({
          title: 'User blocked',
          message: 'You will no longer see contributions from this user.',
          variant: 'info',
        });
        return true;
      } catch {
        showToast({
          title: 'Block failed',
          message: 'Unable to block this user right now.',
          variant: 'error',
        });
        return false;
      } finally {
        setIsBlocking(false);
      }
    },
    [isBlocking, showToast]
  );

  const handleUnblockUser = useCallback(
    async (userId: string) => {
      try {
        const result = await unblockUser(userId);

        if (!result.success) {
          showToast({ title: 'Unblock failed', message: 'Unable to unblock this user right now.', variant: 'error' });
          return false;
        }

        showToast({ title: 'User unblocked', message: 'This user is no longer blocked.', variant: 'info' });
        return true;
      } catch {
        showToast({ title: 'Unblock failed', message: 'Unable to unblock this user right now.', variant: 'error' });
        return false;
      }
    },
    [showToast]
  );

  const confirmBlockUser = useCallback(
    (userId: string, displayName?: string) => {
      Alert.alert(
        'Block this user?',
        `You will no longer see contributions from ${displayName ?? 'this user'}. You can unblock them later from your profile.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              void handleBlockUser(userId);
            },
          },
        ]
      );
    },
    [handleBlockUser]
  );

  return {
    isReporting,
    isBlocking,
    handleReportUser,
    handleBlockUser,
    handleUnblockUser,
    confirmBlockUser,
  };
}
