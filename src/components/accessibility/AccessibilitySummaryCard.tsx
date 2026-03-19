import React, { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { AccessibilityFeatures } from '@/types';
import { buildAccessibilityFeatureLabels } from '@/utils/accessibility';

interface AccessibilitySummaryCardProps {
  accessibilityFeatures: AccessibilityFeatures;
  accessibilityScore: number;
  isAccessible: boolean | null;
  title?: string;
  compact?: boolean;
}

function AccessibilitySummaryCardComponent({
  accessibilityFeatures,
  accessibilityScore,
  isAccessible,
  title = 'Accessibility details',
  compact = false,
}: AccessibilitySummaryCardProps) {
  const featureLabels = useMemo(
    () => buildAccessibilityFeatureLabels(accessibilityFeatures, compact ? 4 : undefined),
    [accessibilityFeatures, compact]
  );

  const headline =
    featureLabels.length > 0
      ? `${accessibilityScore}/100 accessibility match`
      : isAccessible
        ? 'Marked accessible'
        : 'Accessibility details not reported yet';

  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${headline}. ${featureLabels.length > 0 ? featureLabels.join(', ') : 'No reported features yet.'}`}
      className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5"
    >
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">{title}</Text>
      <Text className="mt-3 text-xl font-black text-ink-900">{headline}</Text>

      {featureLabels.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {featureLabels.map((label) => (
            <View className="rounded-full bg-brand-50 px-3 py-1.5" key={label}>
              <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-brand-700">{label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-3 text-sm leading-6 text-ink-600">
          Community members have not submitted structured accessibility information for this location yet.
        </Text>
      )}

      {accessibilityFeatures.notes ? (
        <Text className="mt-4 text-sm leading-6 text-ink-600">{accessibilityFeatures.notes}</Text>
      ) : null}
    </View>
  );
}

export const AccessibilitySummaryCard = memo(AccessibilitySummaryCardComponent);
