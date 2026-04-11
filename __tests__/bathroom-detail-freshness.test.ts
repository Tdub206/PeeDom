import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/api/bathrooms', () => ({
  fetchBathroomDetailById: jest.fn(),
}));

import { publicBathroomDetailRowSchema } from '@/lib/supabase-parsers';
import {
  BATHROOM_DETAIL_FOCUS_REFRESH_THRESHOLD_MS,
  shouldRefreshBathroomDetailOnFocus,
} from '@/hooks/useBathroomDetail';

const bathroomDetail = publicBathroomDetailRowSchema.parse({
  id: 'bathroom-1',
  place_name: 'Central Station',
  address_line1: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  postal_code: '98101',
  country_code: 'US',
  latitude: 47.61,
  longitude: -122.33,
  is_locked: false,
  is_accessible: true,
  is_customer_only: false,
  accessibility_features: {
    has_grab_bars: false,
    door_width_inches: null,
    is_automatic_door: false,
    has_changing_table: false,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
    has_braille_signage: false,
    has_wheelchair_ramp: false,
    has_elevator_access: false,
    stall_width_inches: null,
    turning_radius_inches: null,
    notes: null,
    photo_urls: [],
    verification_date: null,
  },
  accessibility_score: 0,
  hours_json: null,
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 10,
  down_votes: 1,
  last_verified_at: '2026-03-16T10:00:00.000Z',
  expires_at: null,
  cleanliness_avg: 4.2,
  updated_at: '2026-03-16T10:00:00.000Z',
});

describe('bathroom detail freshness helper', () => {
  it('does not refetch on a trivial focus bounce while the cache is still fresh', () => {
    const refreshed = shouldRefreshBathroomDetailOnFocus(
      bathroomDetail,
      1_000,
      1_000 + BATHROOM_DETAIL_FOCUS_REFRESH_THRESHOLD_MS - 1
    );

    expect(refreshed).toBe(false);
  });

  it('refetches when the cached detail is stale', () => {
    const refreshed = shouldRefreshBathroomDetailOnFocus(
      bathroomDetail,
      1_000,
      1_000 + BATHROOM_DETAIL_FOCUS_REFRESH_THRESHOLD_MS
    );

    expect(refreshed).toBe(true);
  });

  it('refetches when no bathroom detail is cached yet', () => {
    expect(shouldRefreshBathroomDetailOnFocus(null, 0, 5_000)).toBe(true);
  });
});
