import type {
  BathroomPrediction,
  ContributorTrustTier,
  StallPassEventPayload,
  StallPassEventPropertyValue,
  UserTrustBand,
} from '@/types';

export type PredictionTone = 'strong' | 'watch' | 'uncertain';

function createRandomSegment(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createSignalIdentifier(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}_${randomUuid}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${createRandomSegment()}`;
}

export function normalizeContributorTrustTier(trustTier: ContributorTrustTier): UserTrustBand {
  switch (trustTier) {
    case 'business_verified_manager':
    case 'highly_reliable_local':
      return 'power';
    case 'verified_contributor':
    case 'lightly_trusted':
      return 'normal';
    case 'brand_new':
    case 'flagged_low_trust':
    default:
      return 'newcomer';
  }
}

export function getTrustBandLabel(trustBand: UserTrustBand): string {
  switch (trustBand) {
    case 'power':
      return 'Power contributor';
    case 'normal':
      return 'Trusted contributor';
    case 'newcomer':
    default:
      return 'New contributor';
  }
}

export function getPredictionTone(
  prediction: Pick<BathroomPrediction, 'busy_level' | 'predicted_access_confidence' | 'prediction_confidence'>
): PredictionTone {
  if (prediction.busy_level === 'busy') {
    return 'uncertain';
  }

  if (prediction.predicted_access_confidence >= 85 && prediction.prediction_confidence >= 70) {
    return 'strong';
  }

  if (prediction.predicted_access_confidence >= 60 && prediction.prediction_confidence >= 50) {
    return 'watch';
  }

  return 'uncertain';
}

export function sanitizeStallPassEventProperties(
  properties: StallPassEventPayload
): Record<string, StallPassEventPropertyValue> {
  const sanitizedEntries = Object.entries(properties).flatMap(([key, value]) => {
    if (typeof value === 'undefined') {
      return [];
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      return [[key, value] as const];
    }

    return [];
  });

  return Object.fromEntries(sanitizedEntries);
}
