import { describe, expect, it } from '@jest/globals';
import {
  canSpendPointsOnFeature,
  CODE_REVEAL_UNLOCK_POINTS_COST,
  EMERGENCY_LOOKUP_UNLOCK_POINTS_COST,
  getFeatureUnlockPointsCost,
  hasServerStarterFeatureAccess,
  shouldShowNearbyPremiumPrompt,
} from '@/lib/feature-access';

describe('feature access policy', () => {
  it('derives starter unlock access from the server-backed profile timestamps', () => {
    expect(
      hasServerStarterFeatureAccess(
        {
          free_code_reveal_used_at: null,
          free_emergency_lookup_used_at: null,
        },
        'code_reveal'
      )
    ).toBe(true);

    expect(
      hasServerStarterFeatureAccess(
        {
          free_code_reveal_used_at: '2026-04-18T12:00:00.000Z',
          free_emergency_lookup_used_at: null,
        },
        'code_reveal'
      )
    ).toBe(false);

    expect(
      hasServerStarterFeatureAccess(
        {
          free_code_reveal_used_at: null,
          free_emergency_lookup_used_at: '2026-04-18T12:00:00.000Z',
        },
        'emergency_lookup'
      )
    ).toBe(false);
  });

  it('checks whether a profile has enough points for one-off unlocks', () => {
    expect(getFeatureUnlockPointsCost('code_reveal')).toBe(CODE_REVEAL_UNLOCK_POINTS_COST);
    expect(getFeatureUnlockPointsCost('emergency_lookup')).toBe(EMERGENCY_LOOKUP_UNLOCK_POINTS_COST);

    expect(
      canSpendPointsOnFeature(
        {
          points_balance: CODE_REVEAL_UNLOCK_POINTS_COST,
        },
        'code_reveal'
      )
    ).toBe(true);

    expect(
      canSpendPointsOnFeature(
        {
          points_balance: EMERGENCY_LOOKUP_UNLOCK_POINTS_COST - 1,
        },
        'emergency_lookup'
      )
    ).toBe(false);
  });

  it('only shows the nearby premium prompt when free users have no visible bathrooms but hidden verified options exist', () => {
    expect(
      shouldShowNearbyPremiumPrompt({
        hiddenPremiumVerifiedCount: 2,
        isPremiumUser: false,
        visibleBathroomCount: 0,
      })
    ).toBe(true);

    expect(
      shouldShowNearbyPremiumPrompt({
        hiddenPremiumVerifiedCount: 2,
        isPremiumUser: true,
        visibleBathroomCount: 0,
      })
    ).toBe(false);

    expect(
      shouldShowNearbyPremiumPrompt({
        hiddenPremiumVerifiedCount: 0,
        isPremiumUser: false,
        visibleBathroomCount: 0,
      })
    ).toBe(false);

    expect(
      shouldShowNearbyPremiumPrompt({
        hiddenPremiumVerifiedCount: 2,
        isPremiumUser: false,
        visibleBathroomCount: 1,
      })
    ).toBe(false);
  });
});
