import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const storageState = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(storageState.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    storageState.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    storageState.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    storageState.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(storageState.keys()))),
}));

import { premiumCityPackStorage } from '@/lib/premium-city-packs';
import type { PremiumCityPackManifest, Database } from '@/types';

type BathroomRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

const cityPackManifest: PremiumCityPackManifest = {
  slug: 'seattle-wa-us',
  city: 'Seattle',
  state: 'WA',
  country_code: 'US',
  bathroom_count: 2,
  center_latitude: 47.61,
  center_longitude: -122.33,
  min_latitude: 47.6,
  max_latitude: 47.62,
  min_longitude: -122.35,
  max_longitude: -122.31,
  latest_bathroom_update_at: '2026-03-19T10:00:00.000Z',
  latest_code_verified_at: '2026-03-19T09:00:00.000Z',
};

const bathroomRow: BathroomRow = {
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
    has_changing_table: true,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
  },
  hours_json: null,
  code_id: 'code-1',
  confidence_score: 91,
  up_votes: 12,
  down_votes: 1,
  last_verified_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  expires_at: null,
  cleanliness_avg: 4.5,
  updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
};

describe('premium city pack storage', () => {
  beforeEach(async () => {
    storageState.clear();
  });

  it('saves and lists downloaded city packs', async () => {
    await premiumCityPackStorage.savePack(cityPackManifest, [bathroomRow]);

    const packs = await premiumCityPackStorage.listDownloadedPacks();

    expect(packs).toHaveLength(1);
    expect(packs[0]?.slug).toBe(cityPackManifest.slug);
  });

  it('finds offline bathrooms inside a downloaded city pack region', async () => {
    await premiumCityPackStorage.savePack(cityPackManifest, [bathroomRow]);

    const result = await premiumCityPackStorage.findBathroomsInRegion(
      {
        latitude: 47.61,
        longitude: -122.33,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      {
        isAccessible: null,
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

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.place_name).toBe('Central Station');
  });

  it('searches downloaded city packs with premium filters', async () => {
    await premiumCityPackStorage.savePack(cityPackManifest, [bathroomRow]);

    const result = await premiumCityPackStorage.searchBathrooms({
      query: 'central',
      filters: {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: true,
        hasChangingTable: true,
        isFamilyRestroom: null,
        minCleanlinessRating: null,
      },
      origin: {
        latitude: 47.61,
        longitude: -122.33,
      },
    });

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.accessibility_features.has_changing_table).toBe(true);
  });
});
