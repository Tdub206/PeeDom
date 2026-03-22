import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('profile utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-19T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds initials from display names and email fallbacks', async () => {
    const { getProfileInitials } = await import('@/utils/profile');

    expect(
      getProfileInitials({
        display_name: 'Jane Doe',
        email: 'jane@example.com',
      } as never)
    ).toBe('JD');

    expect(
      getProfileInitials({
        display_name: null,
        email: 'alpha@example.com',
      } as never)
    ).toBe('AL');
  });

  it('builds the eight profile stats expected by the dashboard', async () => {
    const { buildProfileStats } = await import('@/utils/profile');
    const stats = buildProfileStats(
      {
        total_bathrooms_added: 3,
        total_codes_submitted: 7,
        total_code_verifications: 12,
        total_reports_filed: 2,
        total_photos_uploaded: 4,
        total_badges: 5,
        primary_city: 'Seattle',
        primary_state: 'WA',
      },
      {
        points_balance: 550,
        current_streak: 6,
      } as never
    );

    expect(stats).toHaveLength(8);
    expect(stats.find((stat) => stat.key === 'points')?.value).toBe(550);
    expect(stats.find((stat) => stat.key === 'codes_verified')?.value).toBe(12);
  });

  it('formats badge labels, level summaries, and point values for the profile UI', async () => {
    const {
      getBadgeCountLabel,
      getBadgeEmoji,
      getPointEventValue,
      getProfileLevelSummary,
    } = await import('@/utils/profile');

    expect(getBadgeCountLabel(1)).toBe('1 badge');
    expect(getBadgeCountLabel(3)).toBe('3 badges');
    expect(getBadgeEmoji({ badge_category: 'streak' } as never)).toBe('🔥');
    expect(getPointEventValue({ points_awarded: 15 } as never)).toBe('+15');
    expect(getPointEventValue({ points_awarded: -20 } as never)).toBe('-20');
    expect(getProfileLevelSummary(250).label).toContain('Level 3 ·');
  });

  it('formats point event dates into relative profile labels', async () => {
    const { getPointEventDateLabel } = await import('@/utils/profile');

    expect(getPointEventDateLabel('2026-03-19T08:00:00.000Z')).toBe('Today');
    expect(getPointEventDateLabel('2026-03-18T08:00:00.000Z')).toBe('Yesterday');
    expect(getPointEventDateLabel('2026-03-15T08:00:00.000Z')).toBe('4 days ago');
  });
});
