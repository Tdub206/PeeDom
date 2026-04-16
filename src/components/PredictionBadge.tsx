/**
 * NativeWind-styled badge that visualizes the heuristic prediction for a
 * given bathroom. Renders a compact pill with a color + emoji-free icon row
 * (the project codebase avoids emojis). Uses the `useBathroomPredictions`
 * hook so mount = fetch = telemetry.
 */

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useBathroomPredictions } from '@/hooks/useBathroomPredictions';

type Variant = 'compact' | 'detail';

export interface PredictionBadgeProps {
  bathroomId: string;
  variant?: Variant;
}

function accessibilityTone(likelyAccessible: boolean, confidence: number): string {
  if (!likelyAccessible) return 'bg-rose-100 border-rose-200';
  if (confidence >= 0.75) return 'bg-emerald-100 border-emerald-200';
  if (confidence >= 0.45) return 'bg-amber-100 border-amber-200';
  return 'bg-neutral-100 border-neutral-200';
}

function accessibilityTextTone(likelyAccessible: boolean, confidence: number): string {
  if (!likelyAccessible) return 'text-rose-800';
  if (confidence >= 0.75) return 'text-emerald-800';
  if (confidence >= 0.45) return 'text-amber-900';
  return 'text-neutral-700';
}

function busyLabel(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'Busy now';
    case 'medium':
      return 'Some activity';
    default:
      return 'Quiet';
  }
}

function PredictionBadgeComponent({ bathroomId, variant = 'compact' }: PredictionBadgeProps) {
  const { prediction, isLoading, isError } = useBathroomPredictions(bathroomId);

  if (isLoading) {
    return (
      <View className="flex-row items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
        <ActivityIndicator size="small" />
        <Text className="ml-2 text-xs text-neutral-600">Predicting…</Text>
      </View>
    );
  }

  if (isError || !prediction) {
    return (
      <View className="flex-row items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
        <Text className="text-xs text-neutral-600">Prediction unavailable</Text>
      </View>
    );
  }

  const tone = accessibilityTone(prediction.likely_accessible, prediction.confidence);
  const textTone = accessibilityTextTone(prediction.likely_accessible, prediction.confidence);
  const confidencePct = Math.round(prediction.confidence * 100);
  const headline = prediction.likely_accessible ? 'Likely accessible' : 'May be restricted';

  if (variant === 'compact') {
    return (
      <View className={`flex-row items-center rounded-full border px-3 py-1 ${tone}`}>
        <Text className={`text-xs font-semibold ${textTone}`}>{headline}</Text>
        <Text className={`ml-2 text-xs ${textTone}`}>{confidencePct}%</Text>
      </View>
    );
  }

  return (
    <View className={`rounded-2xl border p-3 ${tone}`}>
      <View className="flex-row items-center justify-between">
        <Text className={`text-sm font-semibold ${textTone}`}>{headline}</Text>
        <Text className={`text-xs ${textTone}`}>{confidencePct}% confidence</Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs text-neutral-700">{busyLabel(prediction.busy_level)}</Text>
        {prediction.best_time ? (
          <Text className="text-xs text-neutral-700">Quietest ~ {prediction.best_time}</Text>
        ) : null}
      </View>
      <Text className="mt-2 text-[10px] uppercase tracking-wide text-neutral-500">
        Model {prediction.model_version}
      </Text>
    </View>
  );
}

export const PredictionBadge = React.memo(PredictionBadgeComponent);

export default PredictionBadge;
