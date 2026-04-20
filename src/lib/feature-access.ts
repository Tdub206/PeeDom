import type { UserProfile } from '@/types';

export type FeatureAccessKey = 'code_reveal' | 'emergency_lookup';

export interface NearbyPremiumPromptPolicyInput {
  hiddenPremiumVerifiedCount: number;
  isPremiumUser: boolean;
  visibleBathroomCount: number;
}

export const NEARBY_PREMIUM_PROMPT_RADIUS_METERS = 8047;
export const CODE_REVEAL_UNLOCK_POINTS_COST = 100;
export const EMERGENCY_LOOKUP_UNLOCK_POINTS_COST = 100;

function getStarterAccessTimestamp(
  profile: Pick<UserProfile, 'free_code_reveal_used_at' | 'free_emergency_lookup_used_at'> | null | undefined,
  feature: FeatureAccessKey
): string | null {
  if (!profile) {
    return null;
  }

  switch (feature) {
    case 'code_reveal':
      return profile.free_code_reveal_used_at;
    case 'emergency_lookup':
      return profile.free_emergency_lookup_used_at;
    default:
      return null;
  }
}

export function getFeatureUnlockPointsCost(feature: FeatureAccessKey): number {
  switch (feature) {
    case 'code_reveal':
      return CODE_REVEAL_UNLOCK_POINTS_COST;
    case 'emergency_lookup':
      return EMERGENCY_LOOKUP_UNLOCK_POINTS_COST;
    default:
      return CODE_REVEAL_UNLOCK_POINTS_COST;
  }
}

export function hasServerStarterFeatureAccess(
  profile: Pick<UserProfile, 'free_code_reveal_used_at' | 'free_emergency_lookup_used_at'> | null | undefined,
  feature: FeatureAccessKey
): boolean {
  if (!profile) {
    return false;
  }

  return getStarterAccessTimestamp(profile, feature) === null;
}

export function canSpendPointsOnFeature(
  profile: Pick<UserProfile, 'points_balance'> | null | undefined,
  feature: FeatureAccessKey
): boolean {
  if (!profile) {
    return false;
  }

  return profile.points_balance >= getFeatureUnlockPointsCost(feature);
}

export function shouldShowNearbyPremiumPrompt(
  input: NearbyPremiumPromptPolicyInput
): boolean {
  return !input.isPremiumUser && input.visibleBathroomCount === 0 && input.hiddenPremiumVerifiedCount > 0;
}
