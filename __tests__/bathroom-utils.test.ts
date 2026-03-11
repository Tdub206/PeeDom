import { describe, expect, it } from '@jest/globals';

import { applyBathroomFilters, buildBathroomAddress, calculateDistanceMeters, mapBathroomRowToListItem } from '@/utils/bathroom';
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
  hours_json: null,
  code_id: 'code-1',
  confidence_score: 88,
  up_votes: 14,
  down_votes: 2,
  last_verified_at: '2026-03-10T12:00:00.000Z',
  expires_at: null,
  updated_at: '2026-03-10T12:00:00.000Z',
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
    expect(listItem.primary_code_summary.has_code).toBe(true);
    expect(listItem.distance_meters).toBeGreaterThan(0);
    expect(listItem.sync.cached_at).toBe('2026-03-10T12:05:00.000Z');
  });
});
