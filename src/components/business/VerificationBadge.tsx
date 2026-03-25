import { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BusinessVerificationBadgeType } from '@/types';

interface VerificationBadgeProps {
  badgeType?: BusinessVerificationBadgeType | null;
}

const BADGE_THEME: Record<BusinessVerificationBadgeType, { container: string; icon: string; label: string }> = {
  standard: {
    container: 'bg-brand-600',
    icon: 'white',
    label: 'text-white',
  },
  premium: {
    container: 'bg-ink-900',
    icon: 'white',
    label: 'text-white',
  },
  featured: {
    container: 'bg-warning',
    icon: '#111827',
    label: 'text-ink-900',
  },
};

function VerificationBadgeComponent({ badgeType = 'standard' }: VerificationBadgeProps) {
  const resolvedBadgeType = badgeType ?? 'standard';
  const theme = BADGE_THEME[resolvedBadgeType];

  return (
    <View
      accessibilityLabel={`${resolvedBadgeType} verified bathroom`}
      accessibilityRole="image"
      className={['flex-row items-center rounded-full px-2.5 py-1', theme.container].join(' ')}
    >
      <Ionicons color={theme.icon} name="checkmark" size={12} />
      <Text className={['ml-1 text-[11px] font-black uppercase tracking-[1px]', theme.label].join(' ')}>
        {resolvedBadgeType === 'featured' ? 'Featured' : 'Verified'}
      </Text>
    </View>
  );
}

export const VerificationBadge = memo(VerificationBadgeComponent);
