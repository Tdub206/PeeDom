import {
  AccessibilityFeatures,
  AccessibilityPreferenceState,
  BathroomAccessibilityUpdateResult,
  BathroomListItem,
  DEFAULT_ACCESSIBILITY_FEATURES,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  UpdateAccessibilityPreferencesInput,
  UserAccessibilityPreferences,
} from '@/types';

function formatDistance(distanceMeters?: number): string | null {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return null;
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters} meters away`;
  }

  const kilometers = distanceMeters / 1000;
  return `${kilometers.toFixed(1)} kilometers away`;
}

export function mapUserAccessibilityPreferencesToState(
  preferences: UserAccessibilityPreferences | null
): AccessibilityPreferenceState {
  if (!preferences) {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }

  return {
    requireGrabBars: preferences.require_grab_bars,
    requireAutomaticDoor: preferences.require_automatic_door,
    requireGenderNeutral: preferences.require_gender_neutral,
    requireFamilyRestroom: preferences.require_family_restroom,
    requireChangingTable: preferences.require_changing_table,
    minDoorWidth: preferences.min_door_width_inches,
    minStallWidth: preferences.min_stall_width_inches,
    prioritizeAccessible: preferences.prioritize_accessible,
    hideNonAccessible: preferences.hide_non_accessible,
  };
}

export function mapAccessibilityPreferencesToInput(
  preferences: AccessibilityPreferenceState,
  isAccessibilityMode?: boolean
): UpdateAccessibilityPreferencesInput {
  return {
    accessibility_mode_enabled: Boolean(isAccessibilityMode),
    require_grab_bars: preferences.requireGrabBars,
    require_automatic_door: preferences.requireAutomaticDoor,
    require_gender_neutral: preferences.requireGenderNeutral,
    require_family_restroom: preferences.requireFamilyRestroom,
    require_changing_table: preferences.requireChangingTable,
    min_door_width_inches: preferences.minDoorWidth,
    min_stall_width_inches: preferences.minStallWidth,
    prioritize_accessible: preferences.prioritizeAccessible,
    hide_non_accessible: preferences.hideNonAccessible,
  };
}

export function buildAccessibilityFeatureLabels(
  accessibilityFeatures: AccessibilityFeatures = DEFAULT_ACCESSIBILITY_FEATURES,
  maxItems?: number
): string[] {
  const labels: string[] = [];

  if (accessibilityFeatures.has_grab_bars) {
    labels.push('Grab bars');
  }

  if (accessibilityFeatures.is_automatic_door) {
    labels.push('Automatic door');
  }

  if (accessibilityFeatures.has_wheelchair_ramp) {
    labels.push('Wheelchair ramp');
  }

  if (accessibilityFeatures.has_elevator_access) {
    labels.push('Elevator access');
  }

  if (accessibilityFeatures.has_changing_table) {
    labels.push('Changing table');
  }

  if (accessibilityFeatures.is_family_restroom) {
    labels.push('Family restroom');
  }

  if (accessibilityFeatures.is_gender_neutral) {
    labels.push('Gender neutral');
  }

  if (accessibilityFeatures.has_audio_cue) {
    labels.push('Audio cue');
  }

  if (accessibilityFeatures.has_braille_signage) {
    labels.push('Braille signage');
  }

  if (typeof accessibilityFeatures.door_width_inches === 'number') {
    labels.push(`${accessibilityFeatures.door_width_inches}" door`);
  }

  if (typeof accessibilityFeatures.stall_width_inches === 'number') {
    labels.push(`${accessibilityFeatures.stall_width_inches}" stall`);
  }

  if (typeof accessibilityFeatures.turning_radius_inches === 'number') {
    labels.push(`${accessibilityFeatures.turning_radius_inches}" turning radius`);
  }

  return typeof maxItems === 'number' ? labels.slice(0, maxItems) : labels;
}

export function countActiveAccessibilityPreferences(preferences: AccessibilityPreferenceState): number {
  return Number(preferences.requireGrabBars) +
    Number(preferences.requireAutomaticDoor) +
    Number(preferences.requireGenderNeutral) +
    Number(preferences.requireFamilyRestroom) +
    Number(preferences.requireChangingTable) +
    Number(preferences.prioritizeAccessible) +
    Number(preferences.hideNonAccessible) +
    Number(typeof preferences.minDoorWidth === 'number') +
    Number(typeof preferences.minStallWidth === 'number');
}

export function buildBathroomAccessibilityLabel(
  bathroom: Pick<
    BathroomListItem,
    | 'place_name'
    | 'distance_meters'
    | 'flags'
    | 'accessibility_features'
    | 'accessibility_score'
    | 'primary_code_summary'
  >
): string {
  const parts: string[] = [bathroom.place_name];
  const distanceLabel = formatDistance(bathroom.distance_meters);

  if (distanceLabel) {
    parts.push(distanceLabel);
  }

  if (bathroom.flags.is_locked) {
    parts.push(bathroom.primary_code_summary.has_code ? 'locked with code available' : 'locked without code');
  } else {
    parts.push('walk-in access');
  }

  if (bathroom.accessibility_score > 0) {
    parts.push(`accessibility score ${bathroom.accessibility_score} out of 100`);
  }

  const featureLabels = buildAccessibilityFeatureLabels(bathroom.accessibility_features, 4);

  if (featureLabels.length > 0) {
    parts.push(`features ${featureLabels.join(', ')}`);
  }

  return parts.join('. ');
}

export function mergeBathroomAccessibilityUpdateResult(
  result: BathroomAccessibilityUpdateResult,
  existingFeatures: AccessibilityFeatures
): AccessibilityFeatures {
  return {
    ...existingFeatures,
    ...result.accessibility_features,
  };
}
