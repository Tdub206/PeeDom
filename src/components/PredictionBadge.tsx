import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { BathroomPrediction } from '@/types';
import { getPredictionTone } from '@/lib/stallpass-signals';

interface PredictionBadgeProps {
  errorMessage?: string | null;
  isLoading?: boolean;
  prediction: BathroomPrediction | null;
}

function formatBestVisitHour(bestVisitHour: number | null): string | null {
  if (bestVisitHour === null) {
    return null;
  }

  const normalizedHour = Math.max(0, Math.min(23, bestVisitHour));
  const period = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${displayHour} ${period}`;
}

function PredictionBadgeComponent({
  errorMessage = null,
  isLoading = false,
  prediction,
}: PredictionBadgeProps) {
  const tone = prediction ? getPredictionTone(prediction) : 'uncertain';
  const bestVisitLabel = prediction ? formatBestVisitHour(prediction.best_visit_hour) : null;
  const toneClasses =
    tone === 'strong'
      ? 'border-success/30 bg-success/10'
      : tone === 'watch'
        ? 'border-warning/30 bg-warning/10'
        : 'border-surface-strong bg-surface-card';

  return (
    <View className={`mt-4 rounded-[28px] border px-5 py-5 ${toneClasses}`}>
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Prediction</Text>

      {prediction ? (
        <>
          <Text className="mt-2 text-2xl font-black text-ink-900">
            {Math.round(prediction.predicted_access_confidence)}% likely to work
          </Text>
          <Text className="mt-2 text-sm leading-6 text-ink-700">{prediction.recommended_copy}</Text>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <View className="rounded-2xl bg-white/60 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-ink-500">Model confidence</Text>
              <Text className="mt-1 text-sm font-bold text-ink-900">
                {Math.round(prediction.prediction_confidence)}%
              </Text>
            </View>
            <View className="rounded-2xl bg-white/60 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-ink-500">Traffic</Text>
              <Text className="mt-1 text-sm font-bold capitalize text-ink-900">{prediction.busy_level}</Text>
            </View>
            {bestVisitLabel ? (
              <View className="rounded-2xl bg-white/60 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-ink-500">Best time</Text>
                <Text className="mt-1 text-sm font-bold text-ink-900">{bestVisitLabel}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <Text className="mt-2 text-sm leading-6 text-ink-600">
          {isLoading
            ? 'Building a launch-safe access prediction from current community signals.'
            : errorMessage ?? 'Prediction data is not available yet for this bathroom.'}
        </Text>
      )}
    </View>
  );
}

export const PredictionBadge = memo(PredictionBadgeComponent);
