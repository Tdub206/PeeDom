import { describe, expect, it } from '@jest/globals';
import {
  dbBathroomStatusEventSchema,
  dbPremiumArrivalAlertSchema,
  dbPointEventSchema,
  dbCodeRevealGrantSchema,
  dbCodeVoteSchema,
  dbProfileSchema,
  dbUserBadgeSchema,
  gamificationSummarySchema,
  leaderboardEntrySchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  premiumCityPackManifestSchema,
  premiumRedemptionSchema,
  publicBathroomDetailRowSchema,
} from '@/lib/supabase-parsers';

describe('parseSupabaseNullableRow', () => {
  it('parses a valid profile row', () => {
    const result = parseSupabaseNullableRow(
      dbProfileSchema,
      {
        id: 'user-123',
        email: 'person@example.com',
        display_name: 'Person',
        role: 'user',
        points_balance: 10,
        is_premium: false,
        premium_expires_at: null,
        is_suspended: false,
        current_streak: 3,
        longest_streak: 7,
        last_contribution_date: '2026-03-15',
        streak_multiplier: 1,
        streak_multiplier_expires_at: null,
        push_token: null,
        push_enabled: true,
        notification_prefs: {
          code_verified: true,
          favorite_update: true,
          nearby_new: false,
          streak_reminder: true,
        },
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
      },
      'profile',
      'Unable to parse profile.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('user-123');
  });

  it('returns a schema error for invalid rows', () => {
    const result = parseSupabaseNullableRow(
      dbProfileSchema,
      {
        id: 'user-123',
        email: 'not-an-email',
        display_name: 'Person',
        role: 'user',
        points_balance: 10,
        is_premium: false,
        premium_expires_at: null,
        is_suspended: false,
        current_streak: 0,
        longest_streak: 0,
        last_contribution_date: null,
        streak_multiplier: 1,
        streak_multiplier_expires_at: null,
        push_token: null,
        push_enabled: true,
        notification_prefs: {
          code_verified: true,
          favorite_update: true,
          nearby_new: false,
          streak_reminder: true,
        },
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
      },
      'profile',
      'Unable to parse profile.'
    );

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('SCHEMA_VALIDATION_FAILED');
  });
});

describe('notification and realtime parser schemas', () => {
  it('parses a bathroom live status event', () => {
    const result = parseSupabaseNullableRow(
      dbBathroomStatusEventSchema,
      {
        id: 'status-1',
        bathroom_id: 'bathroom-123',
        reported_by: 'user-123',
        status: 'clean',
        note: 'Freshly stocked.',
        expires_at: '2026-03-16T14:00:00.000Z',
        created_at: '2026-03-16T12:00:00.000Z',
      },
      'bathroom live status',
      'Unable to parse live bathroom status.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe('clean');
  });

  it('parses a premium arrival alert row', () => {
    const result = parseSupabaseNullableRow(
      dbPremiumArrivalAlertSchema,
      {
        id: 'alert-1',
        user_id: 'user-123',
        bathroom_id: 'bathroom-123',
        target_arrival_at: '2026-03-16T14:00:00.000Z',
        lead_minutes: 30,
        status: 'active',
        created_at: '2026-03-16T12:00:00.000Z',
        updated_at: '2026-03-16T12:05:00.000Z',
      },
      'premium arrival alert',
      'Unable to parse premium arrival alert.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.lead_minutes).toBe(30);
  });
});

describe('parseSupabaseRows', () => {
  it('parses public bathroom rows', () => {
    const result = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      [
        {
          id: 'bathroom-123',
          place_name: 'Pike Place Bathroom',
          address_line1: '123 Pike St',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98101',
          country_code: 'US',
          latitude: 47.6097,
          longitude: -122.3422,
          is_locked: true,
          is_accessible: true,
          is_customer_only: false,
          hours_json: null,
          code_id: 'code-123',
          confidence_score: 92,
          up_votes: 10,
          down_votes: 1,
          last_verified_at: '2026-03-15T12:00:00.000Z',
          expires_at: null,
          cleanliness_avg: 4.4,
          updated_at: '2026-03-15T12:00:00.000Z',
        },
      ],
      'bathroom directory',
      'Unable to parse bathrooms.'
    );

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.place_name).toBe('Pike Place Bathroom');
  });

  it('parses server-backed code reveal grants', () => {
    const result = parseSupabaseRows(
      dbCodeRevealGrantSchema,
      [
        {
          id: 'grant-123',
          bathroom_id: 'bathroom-123',
          user_id: 'user-123',
          grant_source: 'rewarded_ad',
          expires_at: '2026-03-17T12:00:00.000Z',
          created_at: '2026-03-16T12:00:00.000Z',
          updated_at: '2026-03-16T12:00:00.000Z',
        },
      ],
      'code reveal grant',
      'Unable to parse reveal grants.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.grant_source).toBe('rewarded_ad');
  });

  it('parses premium city pack manifests', () => {
    const result = parseSupabaseRows(
      premiumCityPackManifestSchema,
      [
        {
          slug: 'seattle-wa-us',
          city: 'Seattle',
          state: 'WA',
          country_code: 'US',
          bathroom_count: 42,
          center_latitude: 47.61,
          center_longitude: -122.33,
          min_latitude: 47.5,
          max_latitude: 47.7,
          min_longitude: -122.4,
          max_longitude: -122.2,
          latest_bathroom_update_at: '2026-03-16T12:00:00.000Z',
          latest_code_verified_at: '2026-03-16T11:00:00.000Z',
        },
      ],
      'premium city packs',
      'Unable to parse premium city pack manifests.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.bathroom_count).toBe(42);
  });
});

describe('dbCodeVoteSchema', () => {
  it('accepts valid code vote rows', () => {
    const result = parseSupabaseNullableRow(
      dbCodeVoteSchema,
      {
        id: 'vote-123',
        code_id: 'code-123',
        user_id: 'user-123',
        vote: 1,
        created_at: '2026-03-16T12:00:00.000Z',
        updated_at: '2026-03-16T12:00:00.000Z',
      },
      'code vote',
      'Unable to parse code vote.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.vote).toBe(1);
  });
});

describe('gamification parser schemas', () => {
  it('parses point events from the activity feed', () => {
    const result = parseSupabaseNullableRow(
      dbPointEventSchema,
      {
        id: 'event-1',
        user_id: 'user-123',
        event_type: 'premium_redeemed',
        reference_table: 'profiles',
        reference_id: 'user-123',
        points_awarded: -1000,
        metadata: { months_redeemed: 1 },
        created_at: '2026-03-16T12:00:00.000Z',
      },
      'point event',
      'Unable to parse point event.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.event_type).toBe('premium_redeemed');
  });

  it('parses earned badges', () => {
    const result = parseSupabaseNullableRow(
      dbUserBadgeSchema,
      {
        id: 'badge-1',
        user_id: 'user-123',
        badge_key: 'first_flush',
        badge_name: 'First Flush',
        badge_description: 'Added your first bathroom.',
        badge_category: 'milestone',
        context_city_slug: null,
        awarded_at: '2026-03-16T12:00:00.000Z',
      },
      'user badge',
      'Unable to parse user badge.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.badge_key).toBe('first_flush');
  });

  it('parses the gamification summary RPC response', () => {
    const result = parseSupabaseRows(
      gamificationSummarySchema,
      [
        {
          total_bathrooms_added: 4,
          total_codes_submitted: 12,
          total_code_verifications: 18,
          total_reports_filed: 2,
          total_photos_uploaded: 6,
          total_badges: 3,
          primary_city: 'Seattle',
          primary_state: 'WA',
        },
      ],
      'gamification summary',
      'Unable to parse gamification summary.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.total_badges).toBe(3);
  });

  it('parses leaderboard rows', () => {
    const result = parseSupabaseRows(
      leaderboardEntrySchema,
      [
        {
          user_id: 'user-123',
          display_name: 'Contributor',
          total_points: 240,
          bathrooms_added: 2,
          codes_submitted: 6,
          verifications: 8,
          photos_uploaded: 4,
          reports_resolved: 1,
          leaderboard_scope: 'global',
          scope_label: 'Global',
          rank: 1,
        },
      ],
      'leaderboard',
      'Unable to parse leaderboard.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.rank).toBe(1);
  });

  it('parses premium redemption results', () => {
    const result = parseSupabaseRows(
      premiumRedemptionSchema,
      [
        {
          user_id: 'user-123',
          months_redeemed: 1,
          points_spent: 1000,
          remaining_points: 240,
          premium_expires_at: '2026-04-16T12:00:00.000Z',
          is_premium: true,
        },
      ],
      'premium redemption',
      'Unable to parse premium redemption.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.remaining_points).toBe(240);
  });
});
