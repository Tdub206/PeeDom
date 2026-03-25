import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { UserBadge } from '@/types';
import { getBadgeCountLabel, getBadgeEmoji } from '@/utils/profile';

interface BadgesGridProps {
  badges: UserBadge[];
  error: string | null;
  isLoading: boolean;
}

function formatAwardedDate(value: string): string {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return 'Award date unavailable';
  }

  return parsedValue.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function BadgesGridComponent({ badges, error, isLoading }: BadgesGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const badgeCountLabel = useMemo(() => getBadgeCountLabel(badges.length), [badges.length]);

  return (
    <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
      <View className="flex-row items-center justify-between gap-4">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Badges</Text>
          <Text className="mt-2 text-2xl font-black text-ink-900">{badgeCountLabel}</Text>
        </View>
        {isLoading ? <ActivityIndicator color={colors.brand[600]} /> : null}
      </View>

      {error ? <Text className="mt-4 text-sm leading-6 text-warning">{error}</Text> : null}

      {!isLoading && !badges.length ? (
        <Text className="mt-4 text-sm leading-6 text-ink-600">
          Contribute bathrooms, photos, and code verifications to unlock your first earned badge.
        </Text>
      ) : null}

      {badges.length ? (
        <View className="mt-5 flex-row flex-wrap gap-3">
          {badges.map((badge) => (
            <Pressable
              accessibilityRole="button"
              className="w-[31%] rounded-[24px] border border-surface-strong bg-surface-base px-3 py-4"
              key={badge.id}
              onPress={() => setSelectedBadge(badge)}
            >
              <Text className="text-center text-3xl">{getBadgeEmoji(badge)}</Text>
              <Text className="mt-3 text-center text-sm font-bold text-ink-900">{badge.badge_name}</Text>
              <Text className="mt-2 text-center text-xs leading-5 text-ink-500">{badge.badge_category}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedBadge)}
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable className="flex-1 items-center justify-center bg-black/55 px-6" onPress={() => setSelectedBadge(null)}>
          <View className="w-full max-w-[320px] rounded-[28px] bg-surface-card px-5 py-6">
            {selectedBadge ? (
              <>
                <Text className="text-center text-5xl">{getBadgeEmoji(selectedBadge)}</Text>
                <Text className="mt-4 text-center text-2xl font-black text-ink-900">{selectedBadge.badge_name}</Text>
                <Text className="mt-3 text-center text-sm leading-6 text-ink-600">
                  {selectedBadge.badge_description}
                </Text>
                <View className="mt-5 rounded-[20px] bg-surface-base px-4 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Awarded</Text>
                  <Text className="mt-2 text-base font-semibold text-ink-900">{formatAwardedDate(selectedBadge.awarded_at)}</Text>
                  <Text className="mt-2 text-sm text-ink-600">Category: {selectedBadge.badge_category}</Text>
                </View>
                <Button className="mt-5" label="Close" onPress={() => setSelectedBadge(null)} variant="secondary" />
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export const BadgesGrid = memo(BadgesGridComponent);
