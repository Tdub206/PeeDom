interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RegionBounds {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface GooglePlaceAutocompleteRequest {
  query?: string;
  sessionToken?: string;
  origin?: Coordinates | null;
  region?: RegionBounds | null;
}

interface GooglePlaceSuggestion {
  placePrediction?: {
    placeId?: string;
    text?: {
      text?: string;
    };
    structuredFormat?: {
      mainText?: {
        text?: string;
      };
      secondaryText?: {
        text?: string;
      };
    };
    distanceMeters?: number;
  };
}

interface GooglePlaceAutocompleteResponse {
  suggestions?: GooglePlaceSuggestion[];
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? '';

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const coordinates = value as Coordinates;
  return isFiniteCoordinate(coordinates.latitude) && isFiniteCoordinate(coordinates.longitude);
}

function isRegionBounds(value: unknown): value is RegionBounds {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const region = value as RegionBounds;
  return (
    isFiniteCoordinate(region.latitude) &&
    isFiniteCoordinate(region.longitude) &&
    typeof region.latitudeDelta === 'number' &&
    Number.isFinite(region.latitudeDelta) &&
    region.latitudeDelta > 0 &&
    typeof region.longitudeDelta === 'number' &&
    Number.isFinite(region.longitudeDelta) &&
    region.longitudeDelta > 0
  );
}

function buildBiasRadiusMeters(
  region: RegionBounds | null | undefined,
  origin: Coordinates | null | undefined
): number | null {
  if (region) {
    const latitudeRadiusMeters = (Math.abs(region.latitudeDelta) * 111_320) / 2;
    const longitudeMetersPerDegree = 111_320 * Math.max(Math.cos((region.latitude * Math.PI) / 180), 0.1);
    const longitudeRadiusMeters = (Math.abs(region.longitudeDelta) * longitudeMetersPerDegree) / 2;

    return Math.max(2_500, Math.min(25_000, Math.ceil(Math.max(latitudeRadiusMeters, longitudeRadiusMeters))));
  }

  if (origin) {
    return 10_000;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  try {
    const googlePlacesApiKey = getRequiredEnv('GOOGLE_PLACES_API_KEY');
    const payload = (await request.json()) as GooglePlaceAutocompleteRequest;
    const query = payload.query?.trim() ?? '';
    const sessionToken = payload.sessionToken?.trim() ?? '';
    const origin = isCoordinates(payload.origin) ? payload.origin : null;
    const region = isRegionBounds(payload.region) ? payload.region : null;

    if (query.length < 3) {
      return jsonResponse(400, {
        error: 'Search at least three characters before requesting suggestions.',
      });
    }

    if (sessionToken.length < 8) {
      return jsonResponse(400, {
        error: 'A valid session token is required.',
      });
    }

    const radiusMeters = buildBiasRadiusMeters(region, origin);
    const biasCenter = region
      ? {
          latitude: region.latitude,
          longitude: region.longitude,
        }
      : origin;

    const body: Record<string, unknown> = {
      input: query,
      sessionToken,
      includedPrimaryTypes: ['street_address', 'route', 'premise', 'subpremise'],
    };

    if (biasCenter && radiusMeters) {
      body.origin = biasCenter;
      body.locationBias = {
        circle: {
          center: biasCenter,
          radius: radiusMeters,
        },
      };
    }

    const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.distanceMeters',
      },
      body: JSON.stringify(body),
    });

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      throw new Error(`Google Places responded with ${googleResponse.status}: ${errorBody}`);
    }

    const googlePayload = (await googleResponse.json()) as GooglePlaceAutocompleteResponse;
    const predictions = (googlePayload.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<GooglePlaceSuggestion['placePrediction']> =>
        Boolean(prediction?.placeId && prediction.text?.text)
      )
      .map((prediction) => ({
        place_id: prediction.placeId ?? '',
        text: prediction.text?.text ?? '',
        primary_text: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
        secondary_text: prediction.structuredFormat?.secondaryText?.text ?? null,
        distance_meters: typeof prediction.distanceMeters === 'number' ? prediction.distanceMeters : null,
      }))
      .slice(0, 5);

    return jsonResponse(200, predictions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Google address suggestions.';

    console.error('[google-place-autocomplete]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
