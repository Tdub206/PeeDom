import { describe, expect, it } from '@jest/globals';
import {
  businessBathroomSettingsSchema,
  businessPromotionSchema,
  dbBathroomStatusEventSchema,
  dbPremiumArrivalAlertSchema,
  dbPointEventSchema,
  dbCodeRevealGrantSchema,
  dbCodeVoteSchema,
  bathroomAccessibilityUpdateResultSchema,
  codeRevealUnlockResultSchema,
  deactivateAccountResultSchema,
  dbProfileSchema,
  dbUserBadgeSchema,
  emergencyLookupAccessResultSchema,
  gamificationSummarySchema,
  importedLocationVerificationResultSchema,
  leaderboardEntrySchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  premiumCityPackManifestSchema,
  premiumRedemptionSchema,
  publicBathroomDetailRowSchema,
  userAccessibilityPreferencesSchema,
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
        is_deactivated: false,
        current_streak: 3,
        longest_streak: 7,
        last_contribution_date: '2026-03-15',
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

describe('profile action parser schemas', () => {
  it('parses account deactivation results', () => {
    const result = parseSupabaseNullableRow(
      deactivateAccountResultSchema,
      {
        success: true,
        user_id: 'user-123',
        deactivated_at: '2026-03-20T12:00:00.000Z',
      },
      'deactivate account result',
      'Unable to parse account deactivation.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.success).toBe(true);
    expect(result.data?.user_id).toBe('user-123');
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
          accessibility_features: {
            has_grab_bars: true,
            door_width_inches: 34,
            is_automatic_door: false,
            has_changing_table: true,
            is_family_restroom: false,
            is_gender_neutral: true,
            has_audio_cue: false,
            has_braille_signage: true,
            has_wheelchair_ramp: true,
            has_elevator_access: false,
            stall_width_inches: 60,
            turning_radius_inches: 64,
            notes: 'Wide stall near the entry.',
            photo_urls: [],
            verification_date: '2026-03-15T12:00:00.000Z',
          },
          accessibility_score: 72,
          hours_json: null,
          code_id: 'code-123',
          confidence_score: 92,
          up_votes: 10,
          down_votes: 1,
          last_verified_at: '2026-03-15T12:00:00.000Z',
          expires_at: null,
          cleanliness_avg: 4.4,
          updated_at: '2026-03-15T12:00:00.000Z',
          imported_location_last_verified_at: '2026-03-16T08:30:00.000Z',
          imported_location_confirmation_count: 3,
          imported_location_denial_count: 1,
          imported_location_weighted_confirmation_score: 3.5,
          imported_location_weighted_denial_score: 1,
          imported_location_freshness_status: 'fresh',
          imported_location_needs_review: false,
        },
      ],
      'bathroom directory',
      'Unable to parse bathrooms.'
    );

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.place_name).toBe('Pike Place Bathroom');
    expect(result.data[0]?.accessibility_score).toBe(72);
    expect(result.data[0]?.stallpass_access_tier).toBe('public');
    expect(result.data[0]?.active_offer_count).toBe(0);
    expect(result.data[0]?.imported_location_freshness_status).toBe('fresh');
    expect(result.data[0]?.imported_location_confirmation_count).toBe(3);
  });

  it('parses imported location verification RPC payloads', () => {
    const result = parseSupabaseNullableRow(
      importedLocationVerificationResultSchema,
      {
        success: true,
        error: null,
        verification_id: 'verification-123',
        created_at: '2026-04-19T18:30:00.000Z',
        bathroom_id: 'bathroom-123',
        location_exists: false,
        next_allowed_at: '2026-04-20T06:30:00.000Z',
        imported_location_last_verified_at: '2026-04-19T18:30:00.000Z',
        imported_location_confirmation_count: 2,
        imported_location_denial_count: 3,
        imported_location_weighted_confirmation_score: 2.5,
        imported_location_weighted_denial_score: 3.5,
        imported_location_freshness_status: 'likely_removed',
        imported_location_needs_review: true,
      },
      'imported location verification result',
      'Unable to parse imported location verification.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.verification_id).toBe('verification-123');
    expect(result.data?.imported_location_freshness_status).toBe('likely_removed');
    expect(result.data?.imported_location_needs_review).toBe(true);
  });

  it('parses server-backed code reveal grants', () => {
    const result = parseSupabaseRows(
      dbCodeRevealGrantSchema,
      [
        {
          id: 'grant-123',
          bathroom_id: 'bathroom-123',
          user_id: 'user-123',
          grant_source: 'starter_free',
          expires_at: '2026-03-17T12:00:00.000Z',
          created_at: '2026-03-16T12:00:00.000Z',
          updated_at: '2026-03-16T12:00:00.000Z',
        },
      ],
      'code reveal grant',
      'Unable to parse reveal grants.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.grant_source).toBe('starter_free');
  });

  it('parses enriched code unlock RPC payloads', () => {
    const result = parseSupabaseRows(
      codeRevealUnlockResultSchema,
      [
        {
          id: 'grant-123',
          bathroom_id: 'bathroom-123',
          user_id: 'user-123',
          grant_source: 'points_redeemed',
          expires_at: '2026-03-17T12:00:00.000Z',
          created_at: '2026-03-16T12:00:00.000Z',
          updated_at: '2026-03-16T12:00:00.000Z',
          points_spent: 100,
          remaining_points: 240,
          used_free_unlock: false,
        },
      ],
      'code reveal unlock result',
      'Unable to parse reveal grants.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.points_spent).toBe(100);
    expect(result.data[0]?.grant_source).toBe('points_redeemed');
  });

  it('parses emergency lookup unlock payloads', () => {
    const result = parseSupabaseRows(
      emergencyLookupAccessResultSchema,
      [
        {
          user_id: 'user-123',
          unlock_method: 'starter_free',
          points_spent: 0,
          remaining_points: 340,
          used_free_unlock: true,
          unlocked_at: '2026-03-16T12:00:00.000Z',
        },
      ],
      'emergency lookup access',
      'Unable to parse emergency lookup access.'
    );

    expect(result.error).toBeNull();
    expect(result.data[0]?.used_free_unlock).toBe(true);
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

describe('accessibility parser schemas', () => {
  it('parses saved user accessibility preferences', () => {
    const result = parseSupabaseNullableRow(
      userAccessibilityPreferencesSchema,
      {
        id: 'prefs-1',
        user_id: 'user-123',
        accessibility_mode_enabled: true,
        require_grab_bars: true,
        require_automatic_door: false,
        require_gender_neutral: true,
        require_family_restroom: false,
        require_changing_table: true,
        min_door_width_inches: 32,
        min_stall_width_inches: 60,
        prioritize_accessible: true,
        hide_non_accessible: false,
        created_at: '2026-03-18T12:00:00.000Z',
        updated_at: '2026-03-18T12:05:00.000Z',
      },
      'accessibility preferences',
      'Unable to parse accessibility preferences.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.accessibility_mode_enabled).toBe(true);
    expect(result.data?.min_stall_width_inches).toBe(60);
  });

  it('parses accessibility update RPC results', () => {
    const result = parseSupabaseNullableRow(
      bathroomAccessibilityUpdateResultSchema,
      {
        bathroom_id: 'bathroom-123',
        accessibility_features: {
          has_grab_bars: true,
          door_width_inches: 34,
          is_automatic_door: false,
          has_changing_table: false,
          is_family_restroom: false,
          is_gender_neutral: false,
          has_audio_cue: false,
          has_braille_signage: true,
          has_wheelchair_ramp: true,
          has_elevator_access: false,
          stall_width_inches: 60,
          turning_radius_inches: 64,
          notes: null,
          photo_urls: [],
          verification_date: '2026-03-18T12:05:00.000Z',
        },
        is_accessible: true,
        accessibility_score: 68,
        updated_at: '2026-03-18T12:05:00.000Z',
      },
      'bathroom accessibility update',
      'Unable to parse bathroom accessibility updates.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.accessibility_score).toBe(68);
    expect(result.data?.accessibility_features.has_braille_signage).toBe(true);
  });
});

describe('business parser schemas', () => {
  it('parses business bathroom settings rows', () => {
    const result = parseSupabaseNullableRow(
      businessBathroomSettingsSchema,
      {
        bathroom_id: 'bathroom-123',
        requires_premium_access: true,
        show_on_free_map: false,
        is_location_verified: true,
        location_verified_at: '2026-03-18T12:05:00.000Z',
        pricing_plan: 'lifetime',
        pricing_plan_granted_at: '2026-03-18T12:05:00.000Z',
        updated_by: 'user-123',
        created_at: '2026-03-18T12:05:00.000Z',
        updated_at: '2026-03-18T12:05:00.000Z',
      },
      'business bathroom settings',
      'Unable to parse business bathroom settings.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.pricing_plan).toBe('lifetime');
  });

  it('parses StallPass business promotions', () => {
    const result = parseSupabaseNullableRow(
      businessPromotionSchema,
      {
        id: 'promotion-123',
        bathroom_id: 'bathroom-123',
        business_user_id: 'user-123',
        title: '10% off coffee',
        description: 'Premium members get a discount after using the restroom.',
        offer_type: 'percentage',
        offer_value: 10,
        promo_code: 'STALLPASS10',
        redemption_instructions: 'Show the cashier your StallPass screen.',
        starts_at: null,
        ends_at: null,
        is_active: true,
        redemptions_count: 0,
        created_at: '2026-03-18T12:05:00.000Z',
        updated_at: '2026-03-18T12:05:00.000Z',
      },
      'business promotion',
      'Unable to parse business promotion.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.offer_type).toBe('percentage');
    expect(result.data?.promo_code).toBe('STALLPASS10');
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

  it('parses one-off unlock redemption events', () => {
    const result = parseSupabaseNullableRow(
      dbPointEventSchema,
      {
        id: 'event-2',
        user_id: 'user-123',
        event_type: 'code_reveal_redeemed',
        reference_table: 'feature_unlocks',
        reference_id: 'unlock-123',
        points_awarded: -100,
        metadata: { feature_key: 'code_reveal' },
        created_at: '2026-03-16T12:00:00.000Z',
      },
      'point event',
      'Unable to parse point event.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.event_type).toBe('code_reveal_redeemed');
  });

  it('parses rewarded ad earn events', () => {
    const result = parseSupabaseNullableRow(
      dbPointEventSchema,
      {
        id: 'event-3',
        user_id: 'user-123',
        event_type: 'ad_watched',
        reference_table: 'ad_watch_log',
        reference_id: 'watch-123',
        points_awarded: 25,
        metadata: { reward_source: 'admob_ssv' },
        created_at: '2026-05-07T12:00:00.000Z',
      },
      'point event',
      'Unable to parse point event.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.event_type).toBe('ad_watched');
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
