import type { BathroomFilters, NeedProfilePresetKey } from '@/types';

export interface NeedProfilePresetDefinition {
  key: NeedProfilePresetKey;
  label: string;
  description: string;
  filters: Partial<BathroomFilters>;
}

const NEED_PROFILE_PRESETS: NeedProfilePresetDefinition[] = [
  {
    key: 'wheelchair',
    label: 'Wheelchair',
    description: 'Prioritize accessible bathrooms with stronger mobility support.',
    filters: {
      isAccessible: true,
      requireGrabBars: true,
      requireAutomaticDoor: true,
      minDoorWidth: 32,
      minStallWidth: 60,
      prioritizeAccessible: true,
    },
  },
  {
    key: 'family_with_child',
    label: 'Family + Child',
    description: 'Changing tables and family restrooms first.',
    filters: {
      hasChangingTable: true,
      isFamilyRestroom: true,
      openNow: true,
      minCleanlinessRating: 3,
    },
  },
  {
    key: 'ibd_urgency',
    label: 'IBD Urgency',
    description: 'Open, low-friction access with cleaner recent signals.',
    filters: {
      openNow: true,
      noCodeRequired: true,
      recentlyVerifiedOnly: true,
      minCleanlinessRating: 3,
    },
  },
  {
    key: 'no_code',
    label: 'No Code',
    description: 'Only bathrooms that avoid locked code-only access.',
    filters: {
      noCodeRequired: true,
      openNow: true,
    },
  },
  {
    key: 'single_user_privacy',
    label: 'Privacy',
    description: 'Single-user or privacy-friendly options first.',
    filters: {
      requireGenderNeutral: true,
      isAccessible: null,
      prioritizeAccessible: null,
      minCleanlinessRating: 3,
    },
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Saved filter combination.',
    filters: {},
  },
];

const BATHROOM_FILTER_KEYS: Array<keyof BathroomFilters> = [
  'isAccessible',
  'isLocked',
  'isCustomerOnly',
  'openNow',
  'noCodeRequired',
  'recentlyVerifiedOnly',
  'hasChangingTable',
  'isFamilyRestroom',
  'requireGrabBars',
  'requireAutomaticDoor',
  'requireGenderNeutral',
  'minDoorWidth',
  'minStallWidth',
  'prioritizeAccessible',
  'hideNonAccessible',
  'minCleanlinessRating',
];

function sanitizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

export function getNeedProfilePresetDefinitions(): NeedProfilePresetDefinition[] {
  return NEED_PROFILE_PRESETS;
}

export function getNeedProfilePreset(
  key: NeedProfilePresetKey | null | undefined
): NeedProfilePresetDefinition | null {
  if (!key) {
    return null;
  }

  return NEED_PROFILE_PRESETS.find((preset) => preset.key === key) ?? null;
}

export function applyNeedProfilePresetToFilters(
  currentFilters: BathroomFilters,
  presetKey: NeedProfilePresetKey
): BathroomFilters {
  const preset = getNeedProfilePreset(presetKey);

  if (!preset) {
    return currentFilters;
  }

  return {
    ...currentFilters,
    ...preset.filters,
  };
}

export function extractNeedProfileFilters(filters: BathroomFilters): Record<string, unknown> {
  return BATHROOM_FILTER_KEYS.reduce<Record<string, unknown>>((accumulator, key) => {
    const value = filters[key];

    if (typeof value === 'boolean' || typeof value === 'number' || value === null) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

export function hydrateNeedProfileFilters(
  payload: Record<string, unknown>,
  fallbackFilters: BathroomFilters
): BathroomFilters {
  const nextFilters: BathroomFilters = {
    ...fallbackFilters,
  };

  BATHROOM_FILTER_KEYS.forEach((key) => {
    const rawValue = payload[key as string];

    if (key === 'minDoorWidth' || key === 'minStallWidth' || key === 'minCleanlinessRating') {
      nextFilters[key] = sanitizeNumber(rawValue);
      return;
    }

    nextFilters[key] = sanitizeBoolean(rawValue);
  });

  return nextFilters;
}

export function buildCustomNeedProfileName(referenceDate = new Date()): string {
  const hour = referenceDate.getHours().toString().padStart(2, '0');
  const minute = referenceDate.getMinutes().toString().padStart(2, '0');
  return `Custom ${hour}:${minute}`;
}
