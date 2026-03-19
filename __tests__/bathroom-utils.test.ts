import { describe, expect, it } from '@jest/globals';

import {
  applyBathroomFilters,
  buildBathroomAddress,
  calculateDistanceMeters,
  getBathroomMapPinTone,
  isBathroomOpenNow,
  mapBathroomRowToListItem,
} from '@/utils/bathroom';
import type { Database } from '@/types';

type BathroomRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

const bathroomRow: BathroomRow = {
  id: 'bathroom-1',
  place_name: 'Central Cafe',
  address_line1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postal_code: '94105',
  country_code: 'US',
  latitude: 37.789,
  longitude: -122.39,
  is_locked: true,
  is_accessible: true,
  is_customer_only: false,
  accessibility_features: {
    has_grab_bars: true,
    door_width_inches: 34,
    is_automatic_door: false,
    has_changing_table: true,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
  },
  hours_json: {
    sunday: [{ open: '00:00', close: '23:59' }],
    monday: [{ open: '00:00', close: '23:59' }],
    tuesday: [{ open: '00:00', close: '23:59' }],
    wednesday: [{ open: '00:00', close: '23:59' }],
    thursday: [{ open: '00:00', close: '23:59' }],
    friday: [{ open: '00:00', close: '23:59' }],
    saturday: [{ open: '00:00', close: '23:59' }],
  },
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 14,
  down_votes: 2,
  last_verified_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  expires_at: null,
  cleanliness_avg: 4.3,
  updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

describe('bathroom utilities', () => {
  it('builds a readable address from a bathroom row', () => {
    expect(buildBathroomAddress(bathroomRow)).toBe('123 Main St San Francisco, CA 94105 US');
  });

  it('calculates meter distances between coordinates', () => {
    const distance = calculateDistanceMeters(
      { latitude: 37.789, longitude: -122.39 },
      { latitude: 37.79, longitude: -122.389 }
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(200);
  });

  it('applies bathroom filters against the returned rows', () => {
    const filteredRows = applyBathroomFilters(
      [
        bathroomRow,
        {
          ...bathroomRow,
          id: 'bathroom-2',
          is_accessible: false,
        },
      ],
      {
        isAccessible: true,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        minCleanlinessRating: null,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-1');
  });

  it('maps a bathroom row into a render-ready list item', () => {
    const listItem = mapBathroomRowToListItem(bathroomRow, {
      cachedAt: '2026-03-10T12:05:00.000Z',
      stale: false,
      origin: {
        latitude: 37.7885,
        longitude: -122.391,
      },
    });

    expect(listItem.place_name).toBe('Central Cafe');
    expect(listItem.cleanliness_avg).toBe(4.3);
    expect(listItem.accessibility_features.has_changing_table).toBe(true);
    expect(listItem.primary_code_summary.has_code).toBe(true);
    expect(listItem.distance_meters).toBeGreaterThan(0);
    expect(listItem.sync.cached_at).toBe('2026-03-10T12:05:00.000Z');
  });

  it('detects whether a bathroom is open based on hours_json', () => {
    const hoursJson = {
      monday: [{ open: '08:00', close: '18:00' }],
    };
    const openNow = isBathroomOpenNow(hoursJson, new Date(2026, 2, 16, 12, 0, 0));
    const closedNow = isBathroomOpenNow(hoursJson, new Date(2026, 2, 16, 22, 30, 0));

    expect(openNow).toBe(true);
    expect(closedNow).toBe(false);
  });

  it('classifies a map pin by lock and code state', () => {
    const lockedWithoutCode = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'bathroom-2',
        code_id: null,
      },
      {
        cachedAt: '2026-03-10T12:05:00.000Z',
        stale: false,
      }
    );

    const unlockedBathroom = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'bathroom-3',
        is_locked: false,
      },
      {
        cachedAt: '2026-03-10T12:05:00.000Z',
        stale: false,
      }
    );

    expect(getBathroomMapPinTone(lockedWithoutCode)).toBe('locked_without_code');
    expect(getBathroomMapPinTone(unlockedBathroom)).toBe('open_unlocked');
  });

  it('filters bathrooms by openNow, noCodeRequired, and cleanliness', () => {
    const filteredRows = applyBathroomFilters(
      [
        bathroomRow,
        {
          ...bathroomRow,
          id: 'bathroom-4',
          is_locked: false,
          code_id: null,
          cleanliness_avg: 4.4,
        },
      ],
      {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: true,
        noCodeRequired: true,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        minCleanlinessRating: 4,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-4');
  });

  it('filters premium restroom metadata for changing tables and recent verifications', () => {
    const filteredRows = applyBathroomFilters(
      [
        bathroomRow,
        {
          ...bathroomRow,
          id: 'bathroom-5',
          accessibility_features: {
            ...(bathroomRow.accessibility_features as Record<string, unknown>),
            has_changing_table: false,
          },
          last_verified_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: true,
        hasChangingTable: true,
        isFamilyRestroom: null,
        minCleanlinessRating: null,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-1');
  });
});
