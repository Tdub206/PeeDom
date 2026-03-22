import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { getCodeTrustSummary } from '@/lib/code-trust';

interface CodeConfidenceCardProps {
  confidenceScore: number | null;
  downVotes?: number | null;
  lastVerifiedAt?: string | null;
  upVotes?: number | null;
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
  unknown: {
    badgeClassName: 'bg-surface-muted text-ink-600',
    meterClassName: 'bg-ink-300',
  },
} as const;

function CodeConfidenceCardComponent({
  confidenceScore,
  downVotes,
  lastVerifiedAt,
  upVotes,
}: CodeConfidenceCardProps) {
  const summary = getCodeTrustSummary({
    confidenceScore,
    downVotes,
    lastVerifiedAt,
    upVotes,
  });
  const toneStyles = TONE_STYLES[summary.tone];

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Live Confidence</Text>
        <Text className={['rounded-full px-3 py-1 text-xs font-semibold', toneStyles.badgeClassName].join(' ')}>
          {summary.toneLabel}
        </Text>
      </View>

      <View className="mt-4 rounded-3xl bg-surface-muted px-4 py-4">
        <View className="h-3 overflow-hidden rounded-full bg-surface-strong">
          <View
            className={['h-full rounded-full', toneStyles.meterClassName].join(' ')}
            style={{ width: `${summary.score}%` }}
          />
        </View>
        <View className="mt-3 flex-row items-end justify-between">
          <Text className="text-3xl font-black text-ink-900">{summary.score}%</Text>
          <Text className="text-sm text-ink-600">
            {summary.totalVotes > 0
              ? `${summary.upVotes} yes / ${summary.downVotes} no`
              : 'Waiting on community signals'}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-2">
        {summary.freshnessLabel ? (
          <Text className="text-sm text-ink-700">{summary.freshnessLabel}</Text>
        ) : (
          <Text className="text-sm text-ink-600">Nobody has verified this code yet.</Text>
        )}
        <Text className="text-sm text-ink-600">
          {summary.approvalRatio === null
            ? 'Trust improves as people confirm the code works.'
            : `${Math.round(summary.approvalRatio * 100)}% of recorded votes say the code worked.`}
        </Text>
        {summary.isStale ? (
          <Text className="text-sm font-medium text-warning">
            This code is stale and may need a fresh community verification.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const CodeConfidenceCard = memo(CodeConfidenceCardComponent);
