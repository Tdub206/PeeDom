interface GooglePlaceAddressRequest {
  placeId?: string;
  sessionToken?: string;
}

interface GooglePlaceCoordinates {
  latitude?: number;
  longitude?: number;
}

interface GooglePlaceViewport {
  low?: GooglePlaceCoordinates;
  high?: GooglePlaceCoordinates;
}

interface GooglePlaceAddressResponse {
  id?: string;
  formattedAddress?: string;
  location?: GooglePlaceCoordinates;
  viewport?: GooglePlaceViewport;
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

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  try {
    const googlePlacesApiKey = getRequiredEnv('GOOGLE_PLACES_API_KEY');
    const payload = (await request.json()) as GooglePlaceAddressRequest;
    const placeId = payload.placeId?.trim() ?? '';
    const sessionToken = payload.sessionToken?.trim() ?? '';

    if (!placeId) {
      return jsonResponse(400, {
        error: 'A valid Google Place ID is required.',
      });
    }

    if (sessionToken.length < 8) {
      return jsonResponse(400, {
        error: 'A valid session token is required.',
      });
    }

    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set('sessionToken', sessionToken);

    const googleResponse = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': 'id,formattedAddress,location,viewport',
      },
    });

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      throw new Error(`Google Places responded with ${googleResponse.status}: ${errorBody}`);
    }

    const place = (await googleResponse.json()) as GooglePlaceAddressResponse;

    if (
      typeof place.location?.latitude !== 'number' ||
      typeof place.location?.longitude !== 'number'
    ) {
      return jsonResponse(422, {
        error: 'Google did not return a valid location for this address.',
      });
    }

    return jsonResponse(200, {
      place_id: place.id ?? placeId,
      formatted_address: place.formattedAddress ?? null,
      location: {
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      },
      viewport:
        place.viewport?.low && place.viewport?.high
          ? {
              low: {
                latitude: place.viewport.low.latitude ?? place.location.latitude,
                longitude: place.viewport.low.longitude ?? place.location.longitude,
              },
              high: {
                latitude: place.viewport.high.latitude ?? place.location.latitude,
                longitude: place.viewport.high.longitude ?? place.location.longitude,
              },
            }
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load that Google address.';

    console.error('[google-place-address]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
