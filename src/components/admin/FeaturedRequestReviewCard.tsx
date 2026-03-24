import { memo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import type { FeaturedRequestListItem } from '@/api/admin';

interface FeaturedRequestReviewCardProps {
  request: FeaturedRequestListItem;
  onApprove: (requestId: string, notes?: string) => void;
  onReject: (requestId: string, notes?: string) => void;
  isModeratingId: string | null;
}

const PLACEMENT_LABELS: Record<string, string> = {
  search_top: 'Search Top',
  map_priority: 'Map Priority',
  nearby_featured: 'Nearby Featured',
};

function FeaturedRequestReviewCardComponent({
  request,
  onApprove,
  onReject,
  isModeratingId,
}: FeaturedRequestReviewCardProps) {
  const [notes, setNotes] = useState('');
  const isModerating = isModeratingId === request.id;
  const isPending = request.status === 'pending';

  const handleApprove = () => {
    Alert.alert(
      'Approve Featured Placement',
      `This will create an active ${PLACEMENT_LABELS[request.placement_type] ?? request.placement_type} placement for ${request.requested_duration_days} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => onApprove(request.id, notes || undefined) },
      ],
    );
  };

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">
            {PLACEMENT_LABELS[request.placement_type] ?? request.placement_type}
          </Text>
          <Text className="mt-1 text-lg font-black tracking-tight text-ink-900">
            {request.requested_duration_days} days
          </Text>
        </View>
        <View className="rounded-full bg-warning/15 px-3 py-1.5">
          <Text className="text-xs font-black uppercase tracking-[1px] text-warning">
            Pending
          </Text>
        </View>
      </View>

      <Text className="mt-2 text-xs text-ink-400">
        Requested {new Date(request.created_at).toLocaleDateString()}
      </Text>

      {isPending ? (
        <View className="mt-4 gap-3">
          <TextInput
            className="rounded-xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-900"
            placeholder="Admin notes (optional)"
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
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
                label="Reject"
                onPress={() => onReject(request.id, notes || undefined)}
                variant="secondary"
                disabled={isModerating}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const FeaturedRequestReviewCard = memo(FeaturedRequestReviewCardComponent);
