import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getLevelProgress, getPointEventLabel, hasActivePremium } from '@/lib/gamification';

describe('hasActivePremium', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true for lifetime premium accounts', () => {
    expect(
      hasActivePremium({
        is_premium: true,
        premium_expires_at: null,
      })
    ).toBe(true);
  });

  it('returns true while the premium expiry is in the future', () => {
    expect(
      hasActivePremium({
        is_premium: true,
        premium_expires_at: '2026-04-01T12:00:00.000Z',
      })
    ).toBe(true);
  });

  it('returns false when the premium expiry has passed', () => {
    expect(
      hasActivePremium({
        is_premium: true,
        premium_expires_at: '2026-03-15T12:00:00.000Z',
      })
    ).toBe(false);
  });
});

describe('getLevelProgress', () => {
  it('starts new users at level 1', () => {
    const progress = getLevelProgress(0);

    expect(progress.level).toBe(1);
    expect(progress.tierName).toBe('Beginner');
    expect(progress.pointsToNextLevel).toBe(100);
  });

  it('advances users every 100 points and changes tiers', () => {
    const progress = getLevelProgress(1350);

    expect(progress.level).toBe(14);
    expect(progress.tierName).toBe('Explorer');
    expect(progress.currentFloor).toBe(1300);
    expect(progress.pointsToNextLevel).toBe(50);
  });

  it('caps progress at level 50', () => {
    const progress = getLevelProgress(99999);

    expect(progress.level).toBe(50);
    expect(progress.progressPercent).toBe(100);
    expect(progress.pointsToNextLevel).toBe(0);
  });
});

describe('getPointEventLabel', () => {
  it('returns user-facing labels for the recent activity feed', () => {
    expect(getPointEventLabel('bathroom_added')).toBe('Bathroom added');
    expect(getPointEventLabel('code_milestone')).toBe('Code milestone bonus');
    expect(getPointEventLabel('premium_redeemed')).toBe('Premium redeemed');
  });
});
