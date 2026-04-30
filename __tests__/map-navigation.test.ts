import { describe, expect, it, jest } from '@jest/globals';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

import {
  buildMapNavigationDestinationQuery,
  buildMapNavigationUrls,
  formatMapNavigationAddress,
} from '@/lib/map-navigation';

describe('map navigation helpers', () => {
  it('formats structured bathroom address parts into a stable address string', () => {
    expect(
      formatMapNavigationAddress({
        line1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country_code: 'US',
      })
    ).toBe('123 Main St San Francisco, CA 94105 US');
  });

  it('prefers the bathroom address in Android navigation queries when one is available', () => {
    expect(
      buildMapNavigationDestinationQuery({
        placeName: 'Central Cafe',
        coordinates: { latitude: 37.789, longitude: -122.39 },
        address: '123 Main St San Francisco, CA 94105 US',
      })
    ).toBe('Central Cafe, 123 Main St San Francisco, CA 94105 US');
  });

  it('falls back to coordinates when no address is available', () => {
    const urls = buildMapNavigationUrls({
      placeName: 'Imported Restroom',
      coordinates: { latitude: 47.61, longitude: -122.33 },
    });

    expect(urls.googleNavigationUrl).toBe('google.navigation:q=47.61%2C-122.33');
    expect(urls.browserFallbackUrl).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=47.61%2C-122.33'
    );
  });

  it('adds walking travel mode parameters for emergency routing', () => {
    const urls = buildMapNavigationUrls(
      {
        placeName: 'Central Cafe',
        coordinates: { latitude: 37.789, longitude: -122.39 },
        address: {
          address_line1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country_code: 'US',
        },
      },
      {
        travelMode: 'walking',
      }
    );

    expect(urls.appleMapsUrl).toContain('dirflg=w');
    expect(urls.googleNavigationUrl).toContain('&mode=w');
    expect(urls.browserFallbackUrl).toContain('&travelmode=walking');
  });
});
