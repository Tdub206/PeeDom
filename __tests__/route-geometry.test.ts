import { describe, expect, it } from '@jest/globals';
import { fetchRouteGeometry } from '@/lib/route-geometry';
import type { Coordinates } from '@/types';

describe('route geometry', () => {
  it('uses a provider-ready straight-line fallback when no Directions key is configured', async () => {
    const previousKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY;
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY = '';

    const origin: Coordinates = {
      latitude: 40.758,
      longitude: -73.9855,
    };
    const destination: Coordinates = {
      latitude: 40.7614,
      longitude: -73.9776,
    };

    try {
      const route = await fetchRouteGeometry(origin, destination);

      expect(route.source).toBe('straight_line_fallback');
      expect(route.points).toEqual([origin, destination]);
      expect(route.distanceMeters).toBeGreaterThan(0);
      expect(route.durationMinutes).toBeGreaterThanOrEqual(1);
    } finally {
      if (typeof previousKey === 'string') {
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY = previousKey;
      } else {
        delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY;
      }
    }
  });
});
