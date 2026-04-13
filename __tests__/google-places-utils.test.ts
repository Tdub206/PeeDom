import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildGoogleAutocompleteBiasRadiusMeters,
  buildRegionFromGoogleViewport,
  createGoogleAutocompleteSessionToken,
  GOOGLE_AUTOCOMPLETE_BIAS_RADIUS_METERS,
  GOOGLE_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  GOOGLE_AUTOCOMPLETE_USEFUL_DESTINATION_TYPES,
  isGoogleAutocompleteEligibleQuery,
  isUsefulDestinationPrediction,
} from '@/utils/google-places';

describe('google places utilities', () => {
  it('exposes the useful-destination autocomplete policy constants', () => {
    expect(GOOGLE_AUTOCOMPLETE_MIN_QUERY_LENGTH).toBe(2);
    expect(GOOGLE_AUTOCOMPLETE_BIAS_RADIUS_METERS).toBe(10_000);
    // Must contain the broad business markers AND key destination tags.
    for (const required of [
      'establishment',
      'point_of_interest',
      'airport',
      'train_station',
      'library',
      'hospital',
      'park',
      'university',
      'gas_station',
      'rest_stop',
      'community_center',
      'amusement_park',
      'zoo',
      'city_hall',
      'church',
      'mosque',
      'campground',
      'gym',
      'movie_theater',
    ]) {
      expect(GOOGLE_AUTOCOMPLETE_USEFUL_DESTINATION_TYPES.has(required)).toBe(true);
    }
  });

  it('accepts autocomplete queries once the 2-character minimum is met', () => {
    expect(isGoogleAutocompleteEligibleQuery('st')).toBe(true);
    expect(isGoogleAutocompleteEligibleQuery('Starbucks')).toBe(true);
    expect(isGoogleAutocompleteEligibleQuery('LAX')).toBe(true);
    expect(isGoogleAutocompleteEligibleQuery('a')).toBe(false);
    expect(isGoogleAutocompleteEligibleQuery('  ')).toBe(false);
  });

  it('creates non-empty autocomplete session tokens', () => {
    const firstToken = createGoogleAutocompleteSessionToken();
    const secondToken = createGoogleAutocompleteSessionToken();

    expect(firstToken).toMatch(/^stallpass_/);
    expect(secondToken).toMatch(/^stallpass_/);
    expect(firstToken).not.toBe(secondToken);
  });

  it('returns the fixed origin-based bias radius when shared location is available', () => {
    expect(
      buildGoogleAutocompleteBiasRadiusMeters({
        latitude: 47.6062,
        longitude: -122.3321,
      })
    ).toBe(GOOGLE_AUTOCOMPLETE_BIAS_RADIUS_METERS);
  });

  it('returns null when there is no shared user location to bias against', () => {
    expect(buildGoogleAutocompleteBiasRadiusMeters(null)).toBeNull();
    expect(buildGoogleAutocompleteBiasRadiusMeters(undefined)).toBeNull();
  });

  it('converts a Google viewport into a React Native map region', () => {
    const region = buildRegionFromGoogleViewport(
      {
        low: { latitude: 47.605, longitude: -122.335 },
        high: { latitude: 47.615, longitude: -122.325 },
      },
      { latitude: 47.61, longitude: -122.33 }
    );

    expect(region.latitude).toBeCloseTo(47.61);
    expect(region.longitude).toBeCloseTo(-122.33);
    expect(region.latitudeDelta).toBeGreaterThan(0.01);
    expect(region.longitudeDelta).toBeGreaterThan(0.01);
  });

  describe('isUsefulDestinationPrediction', () => {
    it('keeps businesses (restaurants, cafes, stores, bars, pharmacies)', () => {
      expect(
        isUsefulDestinationPrediction([
          'seafood_restaurant', 'restaurant', 'food', 'point_of_interest', 'establishment',
        ])
      ).toBe(true);
      expect(isUsefulDestinationPrediction(['cafe', 'food', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['store', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['bar', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['pharmacy', 'health', 'point_of_interest', 'establishment'])).toBe(true);
    });

    it('keeps transit hubs (airports, train/subway/bus stations, rest stops)', () => {
      expect(isUsefulDestinationPrediction(['airport', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['train_station', 'transit_station'])).toBe(true);
      expect(isUsefulDestinationPrediction(['subway_station', 'transit_station'])).toBe(true);
      expect(isUsefulDestinationPrediction(['bus_station', 'transit_station'])).toBe(true);
      expect(isUsefulDestinationPrediction(['rest_stop'])).toBe(true);
    });

    it('keeps public amenities (libraries, parks, hospitals, universities, gyms, campgrounds)', () => {
      expect(isUsefulDestinationPrediction(['library', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['park'])).toBe(true);
      expect(isUsefulDestinationPrediction(['hospital', 'health', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['university', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['gym', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['campground'])).toBe(true);
      expect(isUsefulDestinationPrediction(['rv_park'])).toBe(true);
      expect(isUsefulDestinationPrediction(['community_center'])).toBe(true);
      expect(isUsefulDestinationPrediction(['convention_center', 'point_of_interest'])).toBe(true);
      expect(isUsefulDestinationPrediction(['visitor_center'])).toBe(true);
      expect(isUsefulDestinationPrediction(['gas_station', 'point_of_interest', 'establishment'])).toBe(true);
    });

    it('keeps entertainment venues (amusement parks, zoos, aquariums, movie theaters)', () => {
      expect(isUsefulDestinationPrediction(['amusement_park', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['zoo'])).toBe(true);
      expect(isUsefulDestinationPrediction(['aquarium'])).toBe(true);
      expect(isUsefulDestinationPrediction(['movie_theater', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['stadium', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['museum', 'tourist_attraction', 'point_of_interest', 'establishment'])).toBe(true);
    });

    it('keeps civic and government buildings (city halls, courthouses, post offices)', () => {
      expect(isUsefulDestinationPrediction(['city_hall', 'local_government_office'])).toBe(true);
      expect(isUsefulDestinationPrediction(['courthouse'])).toBe(true);
      expect(isUsefulDestinationPrediction(['post_office'])).toBe(true);
    });

    it('keeps places of worship (churches, mosques, synagogues, temples)', () => {
      expect(isUsefulDestinationPrediction(['church', 'place_of_worship', 'point_of_interest', 'establishment'])).toBe(true);
      expect(isUsefulDestinationPrediction(['mosque', 'place_of_worship'])).toBe(true);
      expect(isUsefulDestinationPrediction(['synagogue'])).toBe(true);
      expect(isUsefulDestinationPrediction(['hindu_temple', 'place_of_worship'])).toBe(true);
    });

    it('drops pure address / route / locality / postal / political predictions', () => {
      expect(isUsefulDestinationPrediction(['street_address'])).toBe(false);
      expect(isUsefulDestinationPrediction(['route'])).toBe(false);
      expect(isUsefulDestinationPrediction(['locality', 'political'])).toBe(false);
      expect(isUsefulDestinationPrediction(['postal_code'])).toBe(false);
      expect(isUsefulDestinationPrediction(['country', 'political'])).toBe(false);
      expect(isUsefulDestinationPrediction(['administrative_area_level_1', 'political'])).toBe(false);
      expect(isUsefulDestinationPrediction(['neighborhood', 'political'])).toBe(false);
      expect(isUsefulDestinationPrediction(['plus_code'])).toBe(false);
      expect(isUsefulDestinationPrediction(['intersection'])).toBe(false);
      expect(isUsefulDestinationPrediction(['premise'])).toBe(false);
    });

    it('drops predictions with missing or empty types arrays', () => {
      expect(isUsefulDestinationPrediction(null)).toBe(false);
      expect(isUsefulDestinationPrediction(undefined)).toBe(false);
      expect(isUsefulDestinationPrediction([])).toBe(false);
    });

    it('would fail if the allow-list were emptied or narrowed to only establishment', () => {
      // A park prediction has no "establishment" tag — so this test
      // catches a regression to establishment-only filtering.
      expect(isUsefulDestinationPrediction(['park'])).toBe(true);
      // A rest stop is literally a bathroom destination.
      expect(isUsefulDestinationPrediction(['rest_stop'])).toBe(true);
      // A zoo without establishment should still match.
      expect(isUsefulDestinationPrediction(['zoo'])).toBe(true);
      // A campground is outdoor-only — no establishment tag expected.
      expect(isUsefulDestinationPrediction(['campground'])).toBe(true);
    });
  });

  describe('allow-list drift prevention', () => {
    // The same allow-list lives in both the Deno edge function and the
    // TS util. They cannot import from each other. This test parses
    // both files and asserts the allow-lists are identical, so any
    // addition/removal in one file without the other fails immediately.
    const edgeFunctionSource = readFileSync(
      join(process.cwd(), 'supabase', 'functions', 'google-place-autocomplete', 'index.ts'),
      'utf8'
    );

    function extractAllowListFromSource(source: string, varName: string): string[] {
      // Match: const VAR_NAME = new Set<string>([\n  'type1',\n  'type2',\n  ...]);
      // or: const VAR_NAME: ReadonlySet<string> = new Set([\n  ...]);
      const pattern = new RegExp(
        `${varName}[^=]*=\\s*new\\s+Set(?:<string>)?\\(\\[([\\s\\S]*?)\\]\\)`,
        'm'
      );
      const match = source.match(pattern);
      if (!match?.[1]) {
        throw new Error(`Could not find ${varName} Set literal in source`);
      }
      // Extract quoted strings, ignoring comments
      return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    }

    it('edge function and util allow-lists contain the same types', () => {
      const utilSource = readFileSync(
        join(process.cwd(), 'src', 'utils', 'google-places.ts'),
        'utf8'
      );
      const edgeTypes = extractAllowListFromSource(edgeFunctionSource, 'USEFUL_DESTINATION_TYPES');
      const utilTypes = extractAllowListFromSource(utilSource, 'GOOGLE_AUTOCOMPLETE_USEFUL_DESTINATION_TYPES');

      expect(edgeTypes.length).toBeGreaterThan(0);
      expect(edgeTypes).toEqual(utilTypes);
    });
  });

  describe('google-place-autocomplete edge function — source contract tripwires', () => {
    const edgeFunctionSource = readFileSync(
      join(process.cwd(), 'supabase', 'functions', 'google-place-autocomplete', 'index.ts'),
      'utf8'
    );

    const stripComments = (source: string): string =>
      source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1'))
        .join('\n');

    const codeOnlySource = stripComments(edgeFunctionSource);

    it('targets the Places API (New) v1 autocomplete endpoint', () => {
      expect(codeOnlySource).toContain('https://places.googleapis.com/v1/places:autocomplete');
    });

    it('requests placePrediction.types in the Google field mask', () => {
      expect(codeOnlySource).toContain('suggestions.placePrediction.types');
    });

    it('does not send includedPrimaryTypes (ambiguous semantics in Places API New)', () => {
      expect(codeOnlySource).not.toMatch(/includedPrimaryTypes\s*:/);
    });

    it('server-side filters predictions against USEFUL_DESTINATION_TYPES', () => {
      expect(codeOnlySource).toMatch(/USEFUL_DESTINATION_TYPES/);
      expect(codeOnlySource).toMatch(/USEFUL_DESTINATION_TYPES\.has/);
    });

    it('enforces the 2-character minimum query length', () => {
      expect(codeOnlySource).toMatch(/MIN_QUERY_LENGTH\s*=\s*2/);
    });

    it('still sends sessionToken and a locationBias circle driven by origin', () => {
      expect(codeOnlySource).toContain('sessionToken');
      expect(codeOnlySource).toContain('locationBias');
      expect(codeOnlySource).toMatch(/circle\s*:/);
      expect(codeOnlySource).toContain('BIAS_RADIUS_METERS');
    });
  });
});
