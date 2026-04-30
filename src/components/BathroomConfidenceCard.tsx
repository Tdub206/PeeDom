import { memo } from 'react';
import { Text, View } from 'react-native';
import { BathroomConfidenceFlag, BathroomConfidenceProfile } from '@/types';

interface BathroomConfidenceCardProps {
  profile: BathroomConfidenceProfile;
}

const TONE_STYLES = {
  high: {
    badgeClassName: 'bg-success/10 text-success',
    meterClassName: 'bg-success',
  },
  low: {
    badgeClassName: 'bg-danger/10 text-danger',
    meterClassName: 'bg-danger',
  },
  medium: {
    badgeClassName: 'bg-warning/10 text-warning',
    meterClassName: 'bg-warning',
  },
} as const;

function getFlagToneClassName(flag: BathroomConfidenceFlag): string {
  switch (flag.tone) {
    case 'positive':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'critical':
      return 'text-danger';
    default:
      return 'text-ink-600';
  }
}

function BathroomConfidenceCardComponent({ profile }: BathroomConfidenceCardProps) {
  const toneStyles = TONE_STYLES[profile.tone];

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Trust Profile</Text>
        <Text className={['rounded-full px-3 py-1 text-xs font-semibold', toneStyles.badgeClassName].join(' ')}>
          {profile.tone_label}
        </Text>
      </View>

      <View className="mt-4 rounded-3xl bg-surface-muted px-4 py-4">
        <View className="h-3 overflow-hidden rounded-full bg-surface-strong">
          <View
            className={['h-full rounded-full', toneStyles.meterClassName].join(' ')}
            style={{ width: `${profile.trust_score}%` }}
          />
        </View>
        <View className="mt-3 flex-row items-end justify-between gap-3">
          <Text className="text-3xl font-black text-ink-900">{profile.trust_score}%</Text>
          <Text className="text-right text-sm leading-5 text-ink-600">{profile.info_freshness_label}</Text>
        </View>
      </View>

      <View className="mt-4 gap-2">
        {profile.flags.slice(0, 6).map((flag, index) => (
          <Text
            className={['text-sm leading-5', getFlagToneClassName(flag)].join(' ')}
            key={`${flag.label}-${flag.tone}-${index}`}
          >
            {flag.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export const BathroomConfidenceCard = memo(BathroomConfidenceCardComponent);
