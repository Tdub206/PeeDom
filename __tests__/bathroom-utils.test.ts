import { describe, expect, it } from '@jest/globals';

import {
  applyBathroomFilters,
  buildBathroomConfidenceProfile,
  buildBathroomRecommendations,
  buildNearbyBathroomHighlights,
  buildBathroomAddress,
  calculateDistanceMeters,
  calculateAccessibilityScore,
  calculateBathroomRecommendationScore,
  getBathroomMapPinTone,
  getBathroomOriginBadgeLabel,
  isBathroomVisibleOnMap,
  isOverpassImportedBathroom,
  isBathroomOpenNow,
  mergeAccessibilityFilters,
  mapBathroomDetailRowToListItem,
  mapBathroomRowToListItem,
  sortBathroomsByFilters,
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
    has_braille_signage: false,
    has_wheelchair_ramp: true,
    has_elevator_access: false,
    stall_width_inches: 62,
    turning_radius_inches: 64,
    notes: 'Wide entry with a clear turning circle.',
    photo_urls: [],
    verification_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  accessibility_score: 55,
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
  verification_badge_type: null,
  stallpass_access_tier: 'public',
  show_on_free_map: true,
  is_business_location_verified: false,
  location_verified_at: null,
  active_offer_count: 0,
  location_archetype: 'general',
  archetype_metadata: {},
  code_policy: 'community',
  allow_user_code_submissions: true,
  has_official_code: false,
  owner_code_last_verified_at: null,
  official_access_instructions: null,
  imported_location_last_verified_at: null,
  imported_location_confirmation_count: 0,
  imported_location_denial_count: 0,
  imported_location_weighted_confirmation_score: 0,
  imported_location_weighted_denial_score: 0,
  imported_location_freshness_status: null,
  imported_location_needs_review: false,
};

const overpassBathroomRow = {
  ...bathroomRow,
  archetype_metadata: {
    import_source: 'osm-overpass-us',
    source_dataset: 'OpenStreetMap Overpass public restrooms',
  },
  imported_location_last_verified_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  imported_location_confirmation_count: 3,
  imported_location_denial_count: 0,
  imported_location_weighted_confirmation_score: 3,
  imported_location_weighted_denial_score: 0,
  imported_location_freshness_status: 'fresh',
  imported_location_needs_review: false,
} satisfies Parameters<typeof mapBathroomRowToListItem>[0];

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
          accessibility_score: 0,
          accessibility_features: {
            ...(bathroomRow.accessibility_features as Record<string, unknown>),
            has_grab_bars: false,
            has_wheelchair_ramp: false,
            has_changing_table: false,
            door_width_inches: null,
            stall_width_inches: null,
            turning_radius_inches: null,
          },
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
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: null,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-1');
  });

  it('maps a bathroom row into a render-ready list item', () => {
    const listItem = mapBathroomRowToListItem(overpassBathroomRow, {
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
    expect(listItem.accessibility_score).toBe(55);
    expect(listItem.primary_code_summary.has_code).toBe(true);
    expect(listItem.distance_meters).toBeGreaterThan(0);
    expect(listItem.stallpass_access_tier).toBe('public');
    expect(listItem.show_on_free_map).toBe(true);
    expect(listItem.archetype_metadata?.import_source).toBe('osm-overpass-us');
    expect(listItem.last_updated_at).toBe(bathroomRow.updated_at);
    expect(listItem.sync.cached_at).toBe('2026-03-10T12:05:00.000Z');
  });

  it('maps a bathroom detail row into a favorite-ready list item without extra screen glue', () => {
    const listItem = mapBathroomDetailRowToListItem(overpassBathroomRow, {
      cachedAt: '2026-03-20T09:15:00.000Z',
    });

    expect(listItem.id).toBe('bathroom-1');
    expect(listItem.place_name).toBe('Central Cafe');
    expect(listItem.primary_code_summary.has_code).toBe(true);
    expect(listItem.archetype_metadata?.import_source).toBe('osm-overpass-us');
    expect(listItem.sync.cached_at).toBe('2026-03-20T09:15:00.000Z');
    expect(listItem.sync.stale).toBe(false);
  });

  it('marks Overpass-imported bathrooms for source badges and review flows', () => {
    const listItem = mapBathroomRowToListItem(overpassBathroomRow, {
      cachedAt: '2026-03-10T12:05:00.000Z',
      stale: false,
    });

    expect(isOverpassImportedBathroom(listItem)).toBe(true);
    expect(getBathroomOriginBadgeLabel(listItem)).toBe('OSM Import');
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

  it('hides premium-only StallPass partners from the free map', () => {
    expect(
      isBathroomVisibleOnMap(
        {
          stallpass_access_tier: 'premium',
          show_on_free_map: false,
        },
        false
      )
    ).toBe(false);

    expect(
      isBathroomVisibleOnMap(
        {
          stallpass_access_tier: 'premium',
          show_on_free_map: false,
        },
        true
      )
    ).toBe(true);
  });

  it('builds nearby highlights from the closest open unlocked bathroom and nearest locked options', () => {
    const baseItem = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'base-bathroom',
        is_locked: false,
      },
      {
        cachedAt: '2026-03-16T12:00:00.000Z',
        stale: false,
      }
    );
    const nearbyHighlights = buildNearbyBathroomHighlights(
      [
        {
          ...baseItem,
          id: 'closed-nearest',
          distance_meters: 40,
          hours: {
            monday: [{ open: '20:00', close: '21:00' }],
          },
        },
        {
          ...baseItem,
          id: 'locked-nearest',
          distance_meters: 60,
          flags: {
            ...baseItem.flags,
            is_locked: true,
          },
        },
        {
          ...baseItem,
          id: 'open-next',
          distance_meters: 110,
          hours: {
            monday: [{ open: '08:00', close: '18:00' }],
          },
        },
        {
          ...baseItem,
          id: 'locked-second',
          distance_meters: 150,
          flags: {
            ...baseItem.flags,
            is_locked: true,
          },
        },
      ],
      {
        lockedLimit: 1,
        targetDate: new Date(2026, 2, 16, 12, 0, 0),
      }
    );

    expect(nearbyHighlights.nearestOpenUnlocked?.id).toBe('open-next');
    expect(nearbyHighlights.lockedBathrooms.map((bathroom) => bathroom.id)).toEqual(['locked-nearest']);
  });

  it('builds a confidence profile with freshness, code reliability, and photo evidence', () => {
    const listItem = mapBathroomRowToListItem(overpassBathroomRow, {
      cachedAt: '2026-03-10T12:05:00.000Z',
      stale: false,
    });
    const profile = buildBathroomConfidenceProfile(listItem, {
      latestPhotoCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      now: new Date(),
    });

    expect(profile.trust_score).toBeGreaterThan(60);
    expect(profile.code_reliability_label).toContain('Code reliability');
    expect(profile.flags.some((flag) => flag.label.includes('Imported location confirmed recently'))).toBe(true);
    expect(profile.photo_evidence_label).toContain('Photo evidence');
  });

  it('recommends the best bathrooms for overall, accessible, and no-code scenarios', () => {
    const accessibleBathroom = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'bathroom-accessible',
        is_locked: false,
        is_customer_only: true,
        accessibility_score: 90,
        confidence_score: 25,
        cleanliness_avg: 2.8,
        last_verified_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
        distance_meters: 220,
      },
      {
        cachedAt: '2026-03-10T12:05:00.000Z',
        stale: false,
      }
    );
    const noCodeBathroom = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'bathroom-no-code',
        is_locked: false,
        accessibility_score: 20,
        code_id: null,
        confidence_score: null,
        distance_meters: 80,
      },
      {
        cachedAt: '2026-03-10T12:05:00.000Z',
        stale: false,
      }
    );
    const lockedBathroom = mapBathroomRowToListItem(
      {
        ...bathroomRow,
        id: 'bathroom-locked',
        distance_meters: 60,
      },
      {
        cachedAt: '2026-03-10T12:05:00.000Z',
        stale: false,
      }
    );
    const recommendations = buildBathroomRecommendations([
      accessibleBathroom,
      noCodeBathroom,
      lockedBathroom,
    ]);

    expect(recommendations.find((item) => item.scenario === 'accessible')?.bathroom?.id).toBe('bathroom-accessible');
    expect(recommendations.find((item) => item.scenario === 'no_code')?.bathroom?.id).toBe('bathroom-no-code');
    expect(
      calculateBathroomRecommendationScore(noCodeBathroom, { scenario: 'no_code' })
    ).toBeGreaterThan(calculateBathroomRecommendationScore(lockedBathroom, { scenario: 'no_code' }));
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
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: null,
        hideNonAccessible: null,
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
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: null,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-1');
  });

  it('filters bathrooms by detailed accessibility requirements', () => {
    const filteredRows = applyBathroomFilters(
      [
        bathroomRow,
        {
          ...bathroomRow,
          id: 'bathroom-6',
          accessibility_features: {
            ...(bathroomRow.accessibility_features as Record<string, unknown>),
            has_grab_bars: false,
            door_width_inches: 30,
          },
          accessibility_score: 20,
        },
      ],
      {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        requireGrabBars: true,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: 32,
        minStallWidth: 60,
        prioritizeAccessible: null,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      }
    );

    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]?.id).toBe('bathroom-1');
  });

  it('scores accessibility features and sorts accessible-first when requested', () => {
    const sortedRows = sortBathroomsByFilters(
      [
        {
          ...bathroomRow,
          id: 'bathroom-7',
          accessibility_features: {
            ...(bathroomRow.accessibility_features as Record<string, unknown>),
            has_grab_bars: false,
            has_wheelchair_ramp: false,
            stall_width_inches: null,
          },
          accessibility_score: 25,
          distance_meters: 150,
        },
        {
          ...bathroomRow,
          id: 'bathroom-8',
          distance_meters: 300,
          accessibility_score: 80,
        },
      ],
      {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: true,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      },
      null
    );

    expect(sortedRows[0]?.id).toBe('bathroom-8');
    expect(calculateAccessibilityScore(mapBathroomRowToListItem(bathroomRow, {
      cachedAt: '2026-03-10T12:05:00.000Z',
      stale: false,
    }).accessibility_features, true)).toBeGreaterThan(0);
  });

  it('merges persistent accessibility preferences into the active filter set', () => {
    const mergedFilters = mergeAccessibilityFilters(
      {
        isAccessible: null,
        isLocked: null,
        isCustomerOnly: null,
        openNow: null,
        noCodeRequired: null,
        recentlyVerifiedOnly: null,
        hasChangingTable: null,
        isFamilyRestroom: null,
        requireGrabBars: null,
        requireAutomaticDoor: null,
        requireGenderNeutral: null,
        minDoorWidth: null,
        minStallWidth: null,
        prioritizeAccessible: null,
        hideNonAccessible: null,
        minCleanlinessRating: null,
      },
      true,
      {
        requireGrabBars: true,
        requireAutomaticDoor: false,
        requireGenderNeutral: true,
        requireFamilyRestroom: false,
        requireChangingTable: true,
        minDoorWidth: 32,
        minStallWidth: null,
        prioritizeAccessible: true,
        hideNonAccessible: true,
      }
    );

    expect(mergedFilters.requireGrabBars).toBe(true);
    expect(mergedFilters.requireGenderNeutral).toBe(true);
    expect(mergedFilters.hasChangingTable).toBe(true);
    expect(mergedFilters.isAccessible).toBe(true);
    expect(mergedFilters.minDoorWidth).toBe(32);
  });
});
