import type {
  BathroomAttributeConfirmation,
  BathroomAttributeConfirmationSourceType,
} from '@/types';

export const SUPPORTED_BATHROOM_CONFIRMATION_FIELDS = [
  'bathroom_exists',
  'is_open',
  'access_type',
  'has_toilet_paper',
  'has_soap',
  'has_hand_dryer',
  'has_paper_towels',
  'has_changing_table',
  'has_family_restroom',
  'is_gender_neutral',
  'is_single_user',
  'is_private_room',
  'stall_count',
  'privacy_level',
  'medical_urgency_friendly',
  'child_friendly',
] as const;

export type SupportedBathroomConfirmationField =
  (typeof SUPPORTED_BATHROOM_CONFIRMATION_FIELDS)[number];

const VERIFIED_SOURCE_TYPES = new Set<BathroomAttributeConfirmationSourceType>([
  'business_verified',
  'admin_verified',
  'municipal_verified',
  'system_import',
]);

export function isSupportedBathroomConfirmationField(
  value: string
): value is SupportedBathroomConfirmationField {
  return (SUPPORTED_BATHROOM_CONFIRMATION_FIELDS as readonly string[]).includes(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeFieldConfirmationConfidence(input: {
  sourceType: BathroomAttributeConfirmationSourceType;
  trustScore?: number;
  hasPhotoEvidence?: boolean;
  repeatedConfirmations?: number;
}): number {
  const trustScore = typeof input.trustScore === 'number' ? input.trustScore : 40;
  const trustWeight = clamp(trustScore / 100, 0, 1);
  const hasVerifiedSource = VERIFIED_SOURCE_TYPES.has(input.sourceType);
  const repeatedBoost = Math.min(0.12, Math.max(0, (input.repeatedConfirmations ?? 0) * 0.02));
  const sourceBoost = hasVerifiedSource ? 0.14 : 0.03;
  const photoBoost = input.hasPhotoEvidence ? 0.08 : 0;

  return Number(clamp(0.35 + trustWeight * 0.35 + sourceBoost + photoBoost + repeatedBoost, 0, 1).toFixed(4));
}

export function buildFieldValueSnapshot(value: unknown): Record<string, unknown> {
  if (value === null || typeof value === 'undefined') {
    return { value: null };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { value };
}

export function getFieldLatestConfirmation(
  confirmations: BathroomAttributeConfirmation[],
  fieldName: string
): BathroomAttributeConfirmation | null {
  const matching = confirmations
    .filter((confirmation) => confirmation.field_name === fieldName)
    .sort(
      (left, right) =>
        new Date(right.last_confirmed_at).getTime() -
        new Date(left.last_confirmed_at).getTime()
    );

  return matching[0] ?? null;
}

export function getBathroomCorrectionOptions(): Array<{
  fieldName: SupportedBathroomConfirmationField;
  label: string;
  helperText: string;
}> {
  return [
    {
      fieldName: 'bathroom_exists',
      label: 'Bathroom still exists',
      helperText: 'Confirm this location is still valid and usable.',
    },
    {
      fieldName: 'is_open',
      label: 'Open right now',
      helperText: 'Confirm whether the bathroom is currently open.',
    },
    {
      fieldName: 'access_type',
      label: 'Access type',
      helperText: 'Public, customer-only, ask employee, key, or code.',
    },
    {
      fieldName: 'has_toilet_paper',
      label: 'Toilet paper',
      helperText: 'Confirm if toilet paper is available.',
    },
    {
      fieldName: 'has_soap',
      label: 'Soap available',
      helperText: 'Confirm if soap is available.',
    },
    {
      fieldName: 'has_hand_dryer',
      label: 'Hand dryer',
      helperText: 'Confirm if the hand dryer is working.',
    },
    {
      fieldName: 'has_paper_towels',
      label: 'Paper towels',
      helperText: 'Confirm if paper towels are available.',
    },
    {
      fieldName: 'has_changing_table',
      label: 'Changing table',
      helperText: 'Confirm if a baby changing table is available.',
    },
    {
      fieldName: 'has_family_restroom',
      label: 'Family restroom',
      helperText: 'Confirm if this location has a family restroom.',
    },
    {
      fieldName: 'is_gender_neutral',
      label: 'Gender neutral',
      helperText: 'Confirm if a gender-neutral option exists.',
    },
    {
      fieldName: 'is_single_user',
      label: 'Single user',
      helperText: 'Confirm if this is a single-user bathroom.',
    },
    {
      fieldName: 'is_private_room',
      label: 'Private room',
      helperText: 'Confirm if this bathroom offers private-room access.',
    },
    {
      fieldName: 'stall_count',
      label: 'Stall count',
      helperText: 'Update stall count when known.',
    },
    {
      fieldName: 'privacy_level',
      label: 'Privacy level',
      helperText: 'Low, medium, high, or single-user privacy.',
    },
    {
      fieldName: 'medical_urgency_friendly',
      label: 'Medical urgency friendly',
      helperText: 'Confirm if urgency access is usually low-friction.',
    },
    {
      fieldName: 'child_friendly',
      label: 'Child friendly',
      helperText: 'Confirm if this location is child friendly.',
    },
  ];
}
