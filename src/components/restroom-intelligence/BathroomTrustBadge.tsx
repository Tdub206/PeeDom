import { memo } from 'react';
import { Text, View } from 'react-native';
import type { BathroomTrustSummary } from '@/types';

interface BathroomTrustBadgeProps {
  summary: BathroomTrustSummary;
  compact?: boolean;
}

function resolveBadgeStyles(level: BathroomTrustSummary['warningLevel']): {
  containerClassName: string;
  textClassName: string;
  label: string;
} {
  switch (level) {
    case 'verified':
      return {
        containerClassName: 'bg-success/10 border-success/20',
        textClassName: 'text-success',
        label: 'Business verified',
      };
    case 'fresh':
      return {
        containerClassName: 'bg-brand-50 border-brand-200',
        textClassName: 'text-brand-700',
        label: 'Fresh confirmation',
      };
    case 'stale':
      return {
        containerClassName: 'bg-warning/10 border-warning/20',
        textClassName: 'text-warning',
        label: 'Stale data',
      };
    case 'mixed':
      return {
        containerClassName: 'bg-surface-muted border-surface-strong',
        textClassName: 'text-ink-700',
        label: 'Mixed signals',
      };
    case 'unknown':
    default:
      return {
        containerClassName: 'bg-surface-muted border-surface-strong',
        textClassName: 'text-ink-700',
        label: 'Community reported',
      };
  }
}

function BathroomTrustBadgeComponent({ summary, compact = false }: BathroomTrustBadgeProps) {
  const styles = resolveBadgeStyles(summary.warningLevel);

  return (
    <View
      className={[
        'self-start rounded-full border px-3 py-1.5',
        styles.containerClassName,
      ].join(' ')}
    >
      <Text className={['font-black uppercase tracking-[0.8px]', compact ? 'text-[10px]' : 'text-xs', styles.textClassName].join(' ')}>
        {styles.label}
      </Text>
    </View>
  );
}

export const BathroomTrustBadge = memo(BathroomTrustBadgeComponent);
