import type {
  BathroomAttributeConfirmation,
  BathroomAttributeConfirmationSourceType,
  BathroomTrustSourceTrailEntry,
  BathroomTrustSummary,
} from '@/types';

const DEFAULT_STALE_WINDOW_HOURS = 24 * 14;

const VERIFIED_SOURCE_TYPES = new Set<BathroomAttributeConfirmationSourceType>([
  'business_verified',
  'admin_verified',
  'municipal_verified',
  'system_import',
]);

interface BuildBathroomTrustSummaryOptions {
  staleWindowHours?: number;
  now?: Date;
}

interface BuildFallbackBathroomTrustSummaryInput {
  lastConfirmedAt?: string | null;
  fallbackUpdatedAt?: string | null;
  confidenceScore?: number | null;
  fieldName?: string;
  staleWindowHours?: number;
  now?: Date;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function parseTimestamp(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getHoursSinceTimestamp(value: string, now: Date): number | null {
  const parsed = parseTimestamp(value);

  if (!parsed) {
    return null;
  }

  return Math.max(0, (now.getTime() - parsed.getTime()) / (60 * 60 * 1000));
}

function buildTrail(confirmations: BathroomAttributeConfirmation[]): BathroomTrustSourceTrailEntry[] {
  return confirmations
    .slice()
    .sort((left, right) => new Date(right.last_confirmed_at).getTime() - new Date(left.last_confirmed_at).getTime())
    .map((confirmation) => ({
      fieldName: confirmation.field_name,
      sourceType: confirmation.source_type,
      confidenceScore: clampConfidence(confirmation.confidence_score),
      lastConfirmedAt: confirmation.last_confirmed_at,
      sourceUserId: confirmation.source_user_id,
      businessId: confirmation.business_id,
    }));
}

export function buildBathroomTrustSummary(
  confirmations: BathroomAttributeConfirmation[],
  options?: BuildBathroomTrustSummaryOptions
): BathroomTrustSummary {
  if (!confirmations.length) {
    return {
      lastConfirmedAt: null,
      confidenceScore: 0,
      sourceTrail: [],
      staleFields: [],
      freshFields: [],
      warningLevel: 'unknown',
    };
  }

  const staleWindowHours = options?.staleWindowHours ?? DEFAULT_STALE_WINDOW_HOURS;
  const now = options?.now ?? new Date();
  const latestByField = new Map<string, BathroomAttributeConfirmation>();

  confirmations.forEach((confirmation) => {
    const current = latestByField.get(confirmation.field_name);

    if (!current) {
      latestByField.set(confirmation.field_name, confirmation);
      return;
    }

    if (new Date(confirmation.last_confirmed_at).getTime() > new Date(current.last_confirmed_at).getTime()) {
      latestByField.set(confirmation.field_name, confirmation);
    }
  });

  const currentFields = Array.from(latestByField.values());
  const staleFields: string[] = [];
  const freshFields: string[] = [];

  currentFields.forEach((field) => {
    const ageHours = getHoursSinceTimestamp(field.last_confirmed_at, now);

    if (ageHours === null || ageHours > staleWindowHours) {
      staleFields.push(field.field_name);
      return;
    }

    freshFields.push(field.field_name);
  });

  const aggregateConfidence =
    currentFields.reduce((sum, field) => {
      const base = clampConfidence(field.confidence_score);
      const sourceBoost = VERIFIED_SOURCE_TYPES.has(field.source_type) ? 0.08 : 0;
      return sum + clampConfidence(base + sourceBoost);
    }, 0) / currentFields.length;

  const hasVerifiedSource = currentFields.some((field) => VERIFIED_SOURCE_TYPES.has(field.source_type));
  let warningLevel: BathroomTrustSummary['warningLevel'] = 'mixed';

  if (!freshFields.length && staleFields.length) {
    warningLevel = 'stale';
  } else if (!staleFields.length && hasVerifiedSource && aggregateConfidence >= 0.75) {
    warningLevel = 'verified';
  } else if (!staleFields.length) {
    warningLevel = 'fresh';
  }

  const mostRecentConfirmation = currentFields
    .map((field) => parseTimestamp(field.last_confirmed_at))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return {
    lastConfirmedAt: mostRecentConfirmation ? mostRecentConfirmation.toISOString() : null,
    confidenceScore: Number((aggregateConfidence * 100).toFixed(1)),
    sourceTrail: buildTrail(currentFields),
    staleFields,
    freshFields,
    warningLevel,
  };
}

export function buildFallbackBathroomTrustSummary(
  input: BuildFallbackBathroomTrustSummaryInput
): BathroomTrustSummary {
  const now = input.now ?? new Date();
  const staleWindowHours = input.staleWindowHours ?? DEFAULT_STALE_WINDOW_HOURS;
  const fieldName = input.fieldName ?? 'access_code_confidence';
  const lastConfirmedAt = input.lastConfirmedAt ?? input.fallbackUpdatedAt ?? null;
  const rawConfidence = typeof input.confidenceScore === 'number' ? input.confidenceScore : 0;
  const normalizedConfidence = clampConfidence(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence);
  const confidenceScore = Number((normalizedConfidence * 100).toFixed(1));
  const ageHours = lastConfirmedAt ? getHoursSinceTimestamp(lastConfirmedAt, now) : null;
  const isFresh = ageHours !== null && ageHours <= staleWindowHours;

  if (!lastConfirmedAt) {
    return {
      lastConfirmedAt: null,
      confidenceScore,
      sourceTrail: [],
      staleFields: [fieldName],
      freshFields: [],
      warningLevel: 'unknown',
    };
  }

  return {
    lastConfirmedAt,
    confidenceScore,
    sourceTrail: [],
    staleFields: isFresh ? [] : [fieldName],
    freshFields: isFresh ? [fieldName] : [],
    warningLevel: !isFresh ? 'stale' : confidenceScore >= 75 ? 'fresh' : 'mixed',
  };
}

export function formatConfirmationRecencyLabel(value: string | null, now = new Date()): string {
  if (!value) {
    return 'Unknown';
  }

  const parsed = parseTimestamp(value);

  if (!parsed) {
    return 'Unknown';
  }

  const elapsedMs = now.getTime() - parsed.getTime();

  if (elapsedMs < 60 * 1000) {
    return 'Confirmed now';
  }

  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes < 60) {
    return `Confirmed ${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `Confirmed ${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays === 1) {
    return 'Confirmed yesterday';
  }

  if (elapsedDays <= 7) {
    return `Confirmed ${elapsedDays} days ago`;
  }

  return 'Stale';
}
