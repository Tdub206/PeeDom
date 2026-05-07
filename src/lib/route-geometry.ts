import type { Coordinates } from '@/types';
import { calculateDistanceMeters } from '@/utils/bathroom';

export interface RouteGeometry {
  points: Coordinates[];
  distanceMeters: number;
  durationMinutes: number | null;
  source: 'google_directions' | 'straight_line_fallback';
}

function decodePolyline(encodedPolyline: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedPolyline.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedPolyline.length);

    const deltaLatitude = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedPolyline.length);

    const deltaLongitude = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return points;
}

function buildFallbackRoute(origin: Coordinates, destination: Coordinates): RouteGeometry {
  const straightLineDistance = calculateDistanceMeters(origin, destination);

  return {
    points: [origin, destination],
    distanceMeters: straightLineDistance,
    durationMinutes: Math.max(1, Math.ceil(straightLineDistance / 80)),
    source: 'straight_line_fallback',
  };
}

export async function fetchRouteGeometry(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteGeometry> {
  const directionsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY?.trim();

  if (!directionsApiKey) {
    return buildFallbackRoute(origin, destination);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=walking&key=${encodeURIComponent(directionsApiKey)}`
    );

    if (!response.ok) {
      return buildFallbackRoute(origin, destination);
    }

    const payload = (await response.json()) as {
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
        }>;
      }>;
      status?: string;
    };

    const route = payload.routes?.[0];
    const encodedPolyline = route?.overview_polyline?.points;

    if (!route || !encodedPolyline) {
      return buildFallbackRoute(origin, destination);
    }

    const decodedPoints = decodePolyline(encodedPolyline);

    if (decodedPoints.length < 2) {
      return buildFallbackRoute(origin, destination);
    }

    const distanceMeters = route.legs?.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) ?? 0;
    const durationSeconds = route.legs?.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0) ?? 0;

    return {
      points: decodedPoints,
      distanceMeters: distanceMeters > 0 ? distanceMeters : calculateDistanceMeters(origin, destination),
      durationMinutes: durationSeconds > 0 ? Math.max(1, Math.ceil(durationSeconds / 60)) : null,
      source: 'google_directions',
    };
  } catch (_error) {
    return buildFallbackRoute(origin, destination);
  }
}
