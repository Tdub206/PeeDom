import * as Location from 'expo-location';
import { Coordinates } from '@/types';

export interface GeocodedPlace {
  name: string;
  coordinates: Coordinates;
}

/**
 * Forward-geocode a free-text query (city name, address, zip) into coordinates.
 * Uses the device's native geocoder via expo-location — no extra API key required.
 * Returns the top result or null if nothing matched.
 */
export async function geocodeQuery(query: string): Promise<GeocodedPlace | null> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return null;
  }

  try {
    const results = await Location.geocodeAsync(trimmed);

    if (!results.length) {
      return null;
    }

    const best = results[0];

    if (typeof best.latitude !== 'number' || typeof best.longitude !== 'number') {
      return null;
    }

    // Reverse-geocode to get a human-readable label for the resolved location.
    let displayName = trimmed;

    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: best.latitude,
        longitude: best.longitude,
      });

      if (reverse.length > 0) {
        const r = reverse[0];
        const parts = [r.city, r.region].filter(Boolean);

        if (parts.length > 0) {
          displayName = parts.join(', ');
        }
      }
    } catch (_e) {
      // Reverse-geocode is best-effort; fall back to the raw query.
    }

    return {
      name: displayName,
      coordinates: {
        latitude: best.latitude,
        longitude: best.longitude,
      },
    };
  } catch (_e) {
    return null;
  }
}
