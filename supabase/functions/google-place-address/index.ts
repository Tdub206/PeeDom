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
  addressComponents?: GooglePlaceAddressComponent[];
}

interface GooglePlaceAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface NormalizedGooglePlaceAddressComponents {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
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

function getAddressComponent(
  components: GooglePlaceAddressComponent[] | undefined,
  type: string
): GooglePlaceAddressComponent | null {
  return components?.find((component) => component.types?.includes(type)) ?? null;
}

function getAddressComponentText(
  components: GooglePlaceAddressComponent[] | undefined,
  type: string,
  format: 'long' | 'short' = 'long'
): string | null {
  const component = getAddressComponent(components, type);
  const value = format === 'short' ? component?.shortText : component?.longText;
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue || null;
}

function buildAddressLine1(components: GooglePlaceAddressComponent[] | undefined): string | null {
  const streetNumber = getAddressComponentText(components, 'street_number', 'short');
  const route = getAddressComponentText(components, 'route');
  const premise = getAddressComponentText(components, 'premise');
  const subpremise = getAddressComponentText(components, 'subpremise', 'short');
  const streetLine = [streetNumber, route].filter(Boolean).join(' ').trim();

  if (streetLine) {
    return [streetLine, subpremise].filter(Boolean).join(' ').trim();
  }

  return premise ?? null;
}

function normalizeAddressComponents(
  components: GooglePlaceAddressComponent[] | undefined
): NormalizedGooglePlaceAddressComponents {
  return {
    address_line1: buildAddressLine1(components),
    city:
      getAddressComponentText(components, 'locality') ??
      getAddressComponentText(components, 'postal_town') ??
      getAddressComponentText(components, 'sublocality_level_1') ??
      getAddressComponentText(components, 'administrative_area_level_3'),
    state: getAddressComponentText(components, 'administrative_area_level_1', 'short'),
    postal_code: getAddressComponentText(components, 'postal_code'),
    country_code: getAddressComponentText(components, 'country', 'short'),
  };
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
        'X-Goog-FieldMask': 'id,formattedAddress,location,viewport,addressComponents',
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

    const normalizedAddressComponents = normalizeAddressComponents(place.addressComponents);

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
      address_components: normalizedAddressComponents,
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
