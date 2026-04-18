import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { BathroomListItem } from '@/types';
import { buildBathroomConfidenceProfile, getBathroomMapPinTone } from '@/utils/bathroom';

interface UrgencyPickerSheetProps {
  candidates: BathroomListItem[];
  isSearching: boolean;
  onSelect: (bathroom: BathroomListItem) => void;
  onDismiss: () => void;
}

const AVG_WALK_SPEED_M_PER_MIN = 80;

function formatWalkTime(meters?: number): string {
  if (typeof meters !== 'number' || meters <= 0) return '?';
  const minutes = Math.ceil(meters / AVG_WALK_SPEED_M_PER_MIN);

  if (minutes <= 1) return '~1 min';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `~${hours}h ${remainder}m` : `~${hours}h`;
  }

  return `~${minutes} min`;
}

function formatDistance(meters?: number): string {
  if (typeof meters !== 'number') return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getStatusLabel(bathroom: BathroomListItem): { label: string; color: string } {
  const tone = getBathroomMapPinTone(bathroom);

  switch (tone) {
    case 'open_unlocked':
      return { label: 'Open', color: colors.success };
    case 'locked_with_code':
      return { label: 'Code available', color: colors.warning };
    case 'locked_without_code':
      return { label: 'Locked', color: colors.danger };
    default:
      return { label: 'Unknown', color: colors.ink[400] };
  }
}

function UrgencyCandidate({
  bathroom,
  rank,
  onSelect,
}: {
  bathroom: BathroomListItem;
  rank: number;
  onSelect: () => void;
}) {
  const status = getStatusLabel(bathroom);
  const isVerified = Boolean(bathroom.verification_badge_type);
  const confidenceProfile = buildBathroomConfidenceProfile(bathroom);

  return (
    <Pressable
      className="flex-row items-center gap-4 rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4"
      onPress={onSelect}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
        <Text className="text-lg font-black text-brand-600">{rank}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-base font-black text-ink-900" numberOfLines={1}>
            {bathroom.place_name}
          </Text>
          {isVerified ? <Ionicons name="shield-checkmark" size={14} color={colors.brand[600]} /> : null}
        </View>
        <View className="mt-1 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
            <Text className="text-xs font-semibold" style={{ color: status.color }}>
              {status.label}
            </Text>
          </View>
          <Text className="text-xs text-ink-500">{confidenceProfile.info_freshness_label}</Text>
          {bathroom.flags.is_accessible ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="accessibility" size={12} color={colors.brand[600]} />
              <Text className="text-xs font-semibold text-brand-600">Accessible</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-2 text-xs leading-5 text-ink-600">{confidenceProfile.code_reliability_label}</Text>
      </View>
      <View className="items-end">
        <View className="flex-row items-center gap-1">
          <Ionicons name="walk-outline" size={14} color={colors.brand[700]} />
          <Text className="text-sm font-black text-brand-700">{formatWalkTime(bathroom.distance_meters)}</Text>
        </View>
        <Text className="mt-0.5 text-xs text-ink-500">{formatDistance(bathroom.distance_meters)}</Text>
      </View>
    </Pressable>
  );
}

function UrgencyPickerSheetComponent({
  candidates,
  isSearching,
  onSelect,
  onDismiss,
}: UrgencyPickerSheetProps) {
  if (isSearching) {
    return (
      <View className="absolute bottom-24 left-4 right-4 items-center rounded-[28px] bg-surface-card px-6 py-8 shadow-lg">
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text className="mt-3 text-base font-bold text-ink-900">Finding the best bathroom right now...</Text>
        <Text className="mt-1 text-sm text-ink-500">
          Searching within 5km and weighting trust, access, and distance
        </Text>
      </View>
    );
  }

  if (candidates.length === 0) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4 rounded-[28px] bg-surface-card px-5 py-5 shadow-lg">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-black text-ink-900">Best Bathrooms Right Now</Text>
          <Text className="mt-0.5 text-xs text-ink-500">Ranked by trust, distance, and likely usability</Text>
        </View>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-base"
          hitSlop={12}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={18} color={colors.ink[600]} />
        </Pressable>
      </View>

      <View className="mt-4 gap-3">
        {candidates.map((bathroom, index) => (
          <UrgencyCandidate
            bathroom={bathroom}
            key={bathroom.id}
            onSelect={() => onSelect(bathroom)}
            rank={index + 1}
          />
        ))}
      </View>
    </View>
  );
}

export const UrgencyPickerSheet = memo(UrgencyPickerSheetComponent);
