import { describe, expect, it } from '@jest/globals';
import {
  updateAccessibilityPreferencesSchema,
  updateBathroomAccessibilitySchema,
} from '@/lib/validators';
import {
  buildAccessibilityFeatureLabels,
  buildBathroomAccessibilityLabel,
  mapAccessibilityPreferencesToInput,
  mapUserAccessibilityPreferencesToState,
} from '@/utils/accessibility';

describe('accessibility validation', () => {
  it('accepts a valid bathroom accessibility update payload', () => {
    const parsed = updateBathroomAccessibilitySchema.parse({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      has_grab_bars: true,
      door_width_inches: 34,
      stall_width_inches: 60,
    });

    expect(parsed.has_grab_bars).toBe(true);
    expect(parsed.door_width_inches).toBe(34);
  });

  it('rejects accessibility updates without any reported features', () => {
    expect(() =>
      updateBathroomAccessibilitySchema.parse({
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    ).toThrow('Add at least one accessibility detail before saving.');
  });

  it('accepts valid accessibility preference payloads', () => {
    const parsed = updateAccessibilityPreferencesSchema.parse({
      accessibility_mode_enabled: true,
      require_grab_bars: true,
      min_door_width_inches: 32,
      prioritize_accessible: true,
    });

    expect(parsed.accessibility_mode_enabled).toBe(true);
    expect(parsed.min_door_width_inches).toBe(32);
  });
});

describe('accessibility utility helpers', () => {
  it('maps server preferences into client preference state', () => {
    const mapped = mapUserAccessibilityPreferencesToState({
      id: 'prefs-1',
      user_id: 'user-123',
      accessibility_mode_enabled: true,
      require_grab_bars: true,
      require_automatic_door: false,
      require_gender_neutral: true,
      require_family_restroom: false,
      require_changing_table: true,
      min_door_width_inches: 32,
      min_stall_width_inches: null,
      prioritize_accessible: true,
      hide_non_accessible: false,
      created_at: '2026-03-19T00:00:00.000Z',
      updated_at: '2026-03-19T00:05:00.000Z',
    });

    expect(mapped.requireGrabBars).toBe(true);
    expect(mapped.requireGenderNeutral).toBe(true);
    expect(mapped.minDoorWidth).toBe(32);
  });

  it('maps client preference state back into API input', () => {
    const mapped = mapAccessibilityPreferencesToInput(
      {
        requireGrabBars: true,
        requireAutomaticDoor: false,
        requireGenderNeutral: false,
        requireFamilyRestroom: true,
        requireChangingTable: true,
        minDoorWidth: 32,
        minStallWidth: 60,
        prioritizeAccessible: true,
        hideNonAccessible: true,
      },
      true
    );

    expect(mapped.accessibility_mode_enabled).toBe(true);
    expect(mapped.require_family_restroom).toBe(true);
    expect(mapped.min_stall_width_inches).toBe(60);
  });

  it('builds human-readable accessibility feature labels and spoken summaries', () => {
    const featureLabels = buildAccessibilityFeatureLabels({
      has_grab_bars: true,
      door_width_inches: 34,
      is_automatic_door: true,
      has_changing_table: false,
      is_family_restroom: false,
      is_gender_neutral: true,
      has_audio_cue: false,
      has_braille_signage: true,
      has_wheelchair_ramp: true,
      has_elevator_access: false,
      stall_width_inches: 60,
      turning_radius_inches: 64,
      notes: null,
      photo_urls: [],
      verification_date: '2026-03-19T00:05:00.000Z',
    });

    const label = buildBathroomAccessibilityLabel({
      place_name: 'Union Station',
      distance_meters: 120,
      flags: {
        is_locked: false,
        is_accessible: true,
        is_customer_only: false,
      },
      accessibility_features: {
        has_grab_bars: true,
        door_width_inches: 34,
        is_automatic_door: true,
        has_changing_table: false,
        is_family_restroom: false,
        is_gender_neutral: true,
        has_audio_cue: false,
        has_braille_signage: true,
        has_wheelchair_ramp: true,
        has_elevator_access: false,
        stall_width_inches: 60,
        turning_radius_inches: 64,
        notes: null,
        photo_urls: [],
        verification_date: '2026-03-19T00:05:00.000Z',
      },
      accessibility_score: 74,
      primary_code_summary: {
        has_code: false,
        confidence_score: null,
        last_verified_at: null,
      },
    });

    expect(featureLabels).toContain('Grab bars');
    expect(featureLabels).toContain('34" door');
    expect(label).toContain('Union Station');
    expect(label).toContain('accessibility score 74 out of 100');
  });
});
