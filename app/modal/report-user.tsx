import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useUserModeration } from '@/hooks/useUserModeration';
import { dismissToSafely } from '@/lib/navigation';
import { routes } from '@/constants/routes';

type ReportReason = 'spam' | 'harassment' | 'false_info' | 'impersonation' | 'inappropriate_content' | 'other';

const REPORT_REASONS: Array<{ key: ReportReason; label: string; description: string }> = [
  { key: 'spam', label: 'Spam', description: 'Repetitive or irrelevant submissions.' },
  { key: 'harassment', label: 'Harassment', description: 'Threatening or abusive behavior.' },
  { key: 'false_info', label: 'False information', description: 'Deliberately submitting incorrect data.' },
  { key: 'impersonation', label: 'Impersonation', description: 'Pretending to be another person or business.' },
  { key: 'inappropriate_content', label: 'Inappropriate content', description: 'Offensive photos or text.' },
  { key: 'other', label: 'Other', description: 'Something else not listed above.' },
];

export default function ReportUserModalScreen() {
  const router = useRouter();
  const { user_id: rawUserId, display_name: rawDisplayName } = useLocalSearchParams<{
    user_id?: string;
    display_name?: string;
  }>();
  const { user } = useAuth();
  const { handleReportUser, isReporting, confirmBlockUser } = useUserModeration();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState('');

  const targetUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const targetDisplayName = Array.isArray(rawDisplayName) ? rawDisplayName[0] : rawDisplayName;

  const closeModal = useCallback(() => {
    dismissToSafely(router, routes.tabs.map, routes.tabs.map);
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!targetUserId || !selectedReason || isReporting) return;

    const success = await handleReportUser(targetUserId, selectedReason, notes.trim() || undefined);
    if (success) {
      closeModal();
    }
  }, [closeModal, handleReportUser, isReporting, notes, selectedReason, targetUserId]);

  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
        <View className="flex-1 justify-center px-6">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-2xl font-black text-ink-900">Sign in required</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              You must be signed in to report a user.
            </Text>
            <Button className="mt-5" label="Close" onPress={closeModal} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!targetUserId) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
        <View className="flex-1 justify-center px-6">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-2xl font-black text-ink-900">Report unavailable</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              We could not identify the user you wanted to report.
            </Text>
            <Button className="mt-5" label="Close" onPress={closeModal} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-6">
        <View className="rounded-[30px] bg-ink-900 px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">User Report</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-white">
            Report {targetDisplayName ?? 'this user'}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">
            Help us keep the community safe. Select the reason and add any context.
          </Text>
        </View>

        <View className="mt-5 rounded-[30px] border border-surface-strong bg-surface-card p-5">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Reason</Text>
          <View className="mt-3 gap-2">
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.key;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    'rounded-2xl border px-4 py-3',
                    isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                  ].join(' ')}
                  key={reason.key}
                  onPress={() => setSelectedReason(reason.key)}
                >
                  <Text className={['text-sm font-bold', isSelected ? 'text-brand-700' : 'text-ink-900'].join(' ')}>
                    {reason.label}
                  </Text>
                  <Text className={['mt-0.5 text-xs', isSelected ? 'text-brand-600' : 'text-ink-500'].join(' ')}>
                    {reason.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-5 rounded-[30px] border border-surface-strong bg-surface-card p-5">
          <Input
            label="Additional details (optional)"
            multiline
            numberOfLines={3}
            onChangeText={setNotes}
            placeholder="Describe the issue in more detail..."
            value={notes}
            maxLength={500}
          />
        </View>

        <View className="mt-5 gap-3">
          <Button
            disabled={!selectedReason || isReporting}
            label={isReporting ? 'Submitting Report...' : 'Submit Report'}
            loading={isReporting}
            onPress={() => void handleSubmit()}
          />
          <Button
            label="Block This User"
            onPress={() => confirmBlockUser(targetUserId, targetDisplayName ?? undefined)}
            variant="secondary"
          />
          <Button label="Cancel" onPress={closeModal} variant="ghost" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
