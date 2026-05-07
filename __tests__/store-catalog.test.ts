import { describe, expect, it } from '@jest/globals';
import { routes } from '@/constants/routes';
import { CODE_REVEAL_UNLOCK_POINTS_COST } from '@/lib/feature-access';
import {
  buildStoreCatalog,
  PREMIUM_MONTH_POINTS_COST,
  STORE_REWARDED_AD_DAILY_LIMIT,
  STORE_REWARDED_AD_POINTS,
} from '@/lib/store/catalog';
import type { UserProfile } from '@/types';

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    display_name: 'Store User',
    role: 'user',
    points_balance: 0,
    is_premium: false,
    premium_expires_at: null,
    is_suspended: false,
    is_deactivated: false,
    current_streak: 0,
    longest_streak: 0,
    last_contribution_date: null,
    streak_multiplier: 1,
    streak_multiplier_expires_at: null,
    free_code_reveal_used_at: null,
    free_emergency_lookup_used_at: null,
    push_token: null,
    push_enabled: true,
    notification_prefs: {
      code_verified: true,
      favorite_update: true,
      nearby_new: false,
      streak_reminder: true,
      arrival_alert: true,
    },
    created_at: '2026-05-07T12:00:00.000Z',
    updated_at: '2026-05-07T12:00:00.000Z',
    ...overrides,
  };
}

describe('store catalog', () => {
  it('defines the rewarded-ad earn policy used by the Store tab', () => {
    expect(STORE_REWARDED_AD_POINTS).toBe(25);
    expect(STORE_REWARDED_AD_DAILY_LIMIT).toBe(5);
  });

  it('exposes real spend targets without charging for basic rescue', () => {
    const catalog = buildStoreCatalog({ profile: buildProfile({ points_balance: PREMIUM_MONTH_POINTS_COST }) });
    const keys = catalog.map((item) => item.key);

    expect(keys).toEqual([
      'premium_month',
      'code_reveal',
      'offline_city_packs',
      'route_planning',
      'advanced_filters',
      'arrival_alerts',
    ]);
    expect(catalog.some((item) => /emergency/i.test(item.title) && item.pointsCost !== null)).toBe(false);
  });

  it('marks premium redemption and contextual code reveals with the correct costs', () => {
    const catalog = buildStoreCatalog({ profile: buildProfile({ points_balance: PREMIUM_MONTH_POINTS_COST }) });
    const premium = catalog.find((item) => item.key === 'premium_month');
    const codeReveal = catalog.find((item) => item.key === 'code_reveal');

    expect(premium?.pointsCost).toBe(PREMIUM_MONTH_POINTS_COST);
    expect(premium?.canAfford).toBe(true);
    expect(codeReveal?.pointsCost).toBe(CODE_REVEAL_UNLOCK_POINTS_COST);
    expect(codeReveal?.route).toBe(routes.tabs.search);
  });

  it('marks premium benefits active when the profile has premium', () => {
    const catalog = buildStoreCatalog({
      profile: buildProfile({
        is_premium: true,
        premium_expires_at: '2099-01-01T00:00:00.000Z',
      }),
    });

    expect(catalog.find((item) => item.key === 'offline_city_packs')?.isActive).toBe(true);
    expect(catalog.find((item) => item.key === 'route_planning')?.canAfford).toBe(true);
  });
});
