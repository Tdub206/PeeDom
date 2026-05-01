import {
  businessDashboardAnalyticsRowsSchema,
  updateBusinessRestroomMetadataSchema,
} from '../apps/business-web/src/lib/business/schemas';
import fs from 'fs';
import path from 'path';

describe('business web restroom metadata validation', () => {
  it('accepts owner-verified restroom metadata with nullable unknown fields', () => {
    const parsed = updateBusinessRestroomMetadataSchema.parse({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      has_toilet_paper: true,
      has_soap: true,
      has_hand_dryer: null,
      has_paper_towels: false,
      has_changing_table: true,
      has_family_restroom: true,
      is_gender_neutral: true,
      is_single_user: null,
      is_private_room: true,
      stall_count: 2,
      privacy_level: 'high',
      access_type: 'ask_employee',
      code_required: false,
      key_required: false,
      customer_only: true,
      ask_employee: true,
      medical_urgency_friendly: true,
      child_friendly: true,
      outdoor_traveler_reliable: null,
      wheelchair_accessible: true,
      door_clear_width_inches: 34,
      turning_space_inches: 60,
      stall_width_inches: 62,
      stall_depth_inches: 72,
      has_grab_bars: true,
      has_accessible_sink: true,
      has_step_free_access: true,
      has_power_door: false,
      accessibility_notes: '  Ramp entrance through the side door.  ',
    });

    expect(parsed.accessibility_notes).toBe('Ramp entrance through the side door.');
    expect(parsed.stall_count).toBe(2);
    expect(parsed.access_type).toBe('ask_employee');
  });

  it('rejects invalid dimensions and stale analytics RPC contracts', () => {
    expect(() =>
      updateBusinessRestroomMetadataSchema.parse({
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        has_toilet_paper: null,
        has_soap: null,
        has_hand_dryer: null,
        has_paper_towels: null,
        has_changing_table: null,
        has_family_restroom: null,
        is_gender_neutral: null,
        is_single_user: null,
        is_private_room: null,
        stall_count: -1,
        privacy_level: 'unknown',
        access_type: 'public',
        code_required: null,
        key_required: null,
        customer_only: null,
        ask_employee: null,
        medical_urgency_friendly: null,
        child_friendly: null,
        outdoor_traveler_reliable: null,
        wheelchair_accessible: null,
        door_clear_width_inches: 0,
        turning_space_inches: null,
        stall_width_inches: null,
        stall_depth_inches: null,
        has_grab_bars: null,
        has_accessible_sink: null,
        has_step_free_access: null,
        has_power_door: null,
        accessibility_notes: null,
      })
    ).toThrow();

    expect(
      businessDashboardAnalyticsRowsSchema.safeParse([
        {
          bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
          claim_id: null,
          place_name: 'Main Street Cafe',
          business_name: 'Main Street Cafe',
          total_favorites: 12,
          open_reports: 0,
          avg_cleanliness: 4.5,
          total_ratings: 4,
          weekly_views: 30,
          verification_badge_type: 'standard',
          has_verification_badge: true,
          has_active_featured_placement: false,
          active_featured_placements: 0,
          last_updated: '2026-04-18T12:00:00.000Z',
          show_on_free_map: true,
        },
      ]).success
    ).toBe(false);
  });

  it('accepts the finalized dashboard analytics row contract', () => {
    const parsed = businessDashboardAnalyticsRowsSchema.parse([
      {
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        claim_id: '650e8400-e29b-41d4-a716-446655440000',
        place_name: 'Main Street Cafe',
        business_name: 'Main Street Cafe',
        total_favorites: 12,
        open_reports: 0,
        avg_cleanliness: 4.5,
        total_ratings: 4,
        weekly_views: 30,
        weekly_unique_visitors: 22,
        monthly_unique_visitors: 88,
        weekly_navigation_count: 9,
        verification_badge_type: 'standard',
        has_verification_badge: true,
        has_active_featured_placement: false,
        active_featured_placements: 0,
        active_offer_count: 2,
        requires_premium_access: false,
        show_on_free_map: true,
        is_location_verified: true,
        location_verified_at: '2026-04-18T12:00:00.000Z',
        pricing_plan: 'standard',
        last_updated: '2026-04-18T12:00:00.000Z',
      },
    ]);

    expect(parsed[0]?.weekly_unique_visitors).toBe(22);
    expect(parsed[0]?.active_offer_count).toBe(2);
  });

  it('does not write business claim ids into business_id confirmations', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/056_business_restroom_metadata_analytics.sql'),
      'utf8'
    );

    expect(migration).toContain('business_id,');
    expect(migration).not.toMatch(/v_claim_id,\s*\n\s*0\.9500/);
  });
});
