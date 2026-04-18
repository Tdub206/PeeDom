import { memo, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import type { AdminClaimListItem } from '@/api/admin';
import { assessClaimModerationRisk } from '@/utils/admin-moderation';

interface ClaimReviewCardProps {
  claim: AdminClaimListItem;
  onApprove: (claimId: string) => void;
  onReject: (claimId: string, reason: string) => void;
  isModeratingId: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/15', text: 'text-warning', label: 'Pending' },
  approved: { bg: 'bg-success/15', text: 'text-success', label: 'Approved' },
  rejected: { bg: 'bg-danger/15', text: 'text-danger', label: 'Rejected' },
};

function ClaimReviewCardComponent({
  claim,
  onApprove,
  onReject,
  isModeratingId,
}: ClaimReviewCardProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const status = STATUS_STYLES[claim.review_status] ?? STATUS_STYLES.pending;
  const assessment = assessClaimModerationRisk(claim);
  const isModerating = isModeratingId === claim.claim_id;
  const isPending = claim.review_status === 'pending';

  const handleApprove = () => {
    Alert.alert(
      'Approve Claim',
      `Approve "${claim.business_name}" for ${claim.place_name}? This will grant verification badge and business role.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => onApprove(claim.claim_id) },
      ],
    );
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    onReject(claim.claim_id, rejectReason);
    setShowRejectInput(false);
    setRejectReason('');
  };

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-black tracking-tight text-ink-900">
            {claim.business_name}
          </Text>
          <Text className="mt-1 text-sm text-ink-600">{claim.place_name}</Text>
          {claim.address ? (
            <Text className="mt-0.5 text-xs text-ink-500">{claim.address}</Text>
          ) : null}
        </View>
        <View className={`rounded-full px-3 py-1.5 ${status.bg}`}>
          <Text className={`text-xs font-black uppercase tracking-[1px] ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-2">
        <View
          className={[
            'self-start rounded-full px-3 py-1.5',
            assessment.priority === 'high'
              ? 'bg-danger/10'
              : assessment.priority === 'medium'
                ? 'bg-warning/10'
                : 'bg-success/10',
          ].join(' ')}
        >
          <Text
            className={[
              'text-xs font-black uppercase tracking-[1px]',
              assessment.priority === 'high'
                ? 'text-danger'
                : assessment.priority === 'medium'
                  ? 'text-warning'
                  : 'text-success',
            ].join(' ')}
          >
            {assessment.priority} review risk
          </Text>
        </View>
        <Text className="text-sm leading-6 text-ink-600">{assessment.summary}</Text>
        <View className="flex-row items-center gap-2">
          <Ionicons name="person-outline" size={14} color="#6b7280" />
          <Text className="text-sm text-ink-600">
            {claim.claimant_display_name ?? 'Unknown'} ({claim.claimant_email ?? claim.contact_email})
          </Text>
        </View>
        {claim.contact_phone ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="call-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-ink-600">{claim.contact_phone}</Text>
          </View>
        ) : null}
        {claim.evidence_url ? (
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => void Linking.openURL(claim.evidence_url!)}
          >
            <Ionicons name="link-outline" size={14} color="#2563eb" />
            <Text className="text-sm font-semibold text-brand-600" numberOfLines={1}>
              View Evidence
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-2">
            <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
            <Text className="text-sm text-warning">No evidence provided</Text>
          </View>
        )}
        <Text className="text-xs text-ink-400">
          Submitted {new Date(claim.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View className="mt-4 gap-2">
        {assessment.signals.slice(0, 4).map((signal) => (
          <Text
            className={[
              'text-sm leading-5',
              signal.tone === 'critical'
                ? 'text-danger'
                : signal.tone === 'warning'
                  ? 'text-warning'
                  : signal.tone === 'positive'
                    ? 'text-success'
                    : 'text-ink-600',
            ].join(' ')}
            key={signal.label}
          >
            {signal.label}
          </Text>
        ))}
      </View>

      {isPending ? (
        <View className="mt-5 gap-3">
          {showRejectInput ? (
            <TextInput
              className="rounded-xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-900"
              placeholder="Rejection reason (optional)"
              placeholderTextColor="#9ca3af"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
          ) : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Approve"
                onPress={handleApprove}
                disabled={isModerating}
              />
            </View>
            <View className="flex-1">
              <Button
                label={showRejectInput ? 'Confirm Reject' : 'Reject'}
                onPress={handleReject}
                variant="secondary"
                disabled={isModerating}
              />
            </View>
          </View>
          {showRejectInput ? (
            <Pressable onPress={() => setShowRejectInput(false)}>
              <Text className="text-center text-sm text-ink-500">Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const ClaimReviewCard = memo(ClaimReviewCardComponent);
