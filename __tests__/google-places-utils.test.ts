import {
  buildGoogleAutocompleteBiasRadiusMeters,
  buildRegionFromGoogleViewport,
  createGoogleAutocompleteSessionToken,
  isAddressLikeSearchQuery,
} from '@/utils/google-places';

describe('google places utilities', () => {
  it('detects address-like search queries', () => {
    expect(isAddressLikeSearchQuery('123 Main St')).toBe(true);
    expect(isAddressLikeSearchQuery('98101')).toBe(true);
    expect(isAddressLikeSearchQuery('Seattle coffee')).toBe(false);
  });

  it('creates non-empty autocomplete session tokens', () => {
    const firstToken = createGoogleAutocompleteSessionToken();
    const secondToken = createGoogleAutocompleteSessionToken();

    expect(firstToken).toMatch(/^stallpass_/);
    expect(secondToken).toMatch(/^stallpass_/);
    expect(firstToken).not.toBe(secondToken);
  });

  it('builds a bounded autocomplete bias radius from a map region', () => {
    const radius = buildGoogleAutocompleteBiasRadiusMeters(
      {
        latitude: 47.6062,
        longitude: -122.3321,
        latitudeDelta: 0.08,
        longitudeDelta: 0.06,
      },
      null
    );

    expect(radius).toBeGreaterThanOrEqual(2500);
    expect(radius).toBeLessThanOrEqual(25000);
  });

  it('converts a Google viewport into a React Native map region', () => {
    const region = buildRegionFromGoogleViewport(
      {
        low: {
          latitude: 47.605,
          longitude: -122.335,
        },
        high: {
          latitude: 47.615,
          longitude: -122.325,
        },
      },
      {
        latitude: 47.61,
        longitude: -122.33,
      }
    );

    expect(region.latitude).toBeCloseTo(47.61);
    expect(region.longitude).toBeCloseTo(-122.33);
    expect(region.latitudeDelta).toBeGreaterThan(0.01);
    expect(region.longitudeDelta).toBeGreaterThan(0.01);
  });
});
