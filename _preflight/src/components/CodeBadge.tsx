import React, { memo, useMemo } from 'react';
import { Text, View } from 'react-native';

interface CodeBadgeProps {
  hasCode: boolean;
  confidenceScore: number | null;
  lastVerifiedAt?: string | null;
}

function CodeBadgeComponent({ hasCode, confidenceScore, lastVerifiedAt }: CodeBadgeProps) {
  const normalizedConfidence = useMemo(() => {
    if (!hasCode || confidenceScore === null) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(confidenceScore)));
  }, [confidenceScore, hasCode]);

  return (
    <View className="rounded-2xl border border-surface-strong bg-surface-card px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
        {hasCode ? 'Code confidence' : 'Code status'}
      </Text>
      <Text className="mt-2 text-base font-bold text-ink-900">
        {hasCode ? `${normalizedConfidence}% community confidence` : 'No code submitted yet'}
      </Text>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <View
          className={hasCode ? 'h-2 rounded-full bg-brand-600' : 'h-2 rounded-full bg-ink-300'}
          style={{ width: `${hasCode ? Math.max(8, normalizedConfidence) : 12}%` }}
        />
      </View>
      <Text className="mt-2 text-xs text-ink-500">
        {lastVerifiedAt
          ? `Last verified ${new Date(lastVerifiedAt).toLocaleDateString()}`
          : hasCode
            ? 'Verification date unavailable.'
            : 'Be the first to verify the access code.'}
      </Text>
    </View>
  );
}

export const CodeBadge = memo(CodeBadgeComponent);
