interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GooglePlaceAutocompleteRequest {
  query?: string;
  sessionToken?: string;
  origin?: Coordinates | null;
}

interface GooglePlaceSuggestion {
  placePrediction?: {
    placeId?: string;
    types?: string[];
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

// Useful-destination filtering for Places API (New) Autocomplete.
//
// `includedPrimaryTypes` in the New API filters on a place's *primary*
// type only and caps at 5 values, so it cannot express "any place a
// bathroom-finder user would care about." Instead we request the full
// `types` array per prediction via the field mask and server-side filter.
//
// A prediction is kept if its `types` array contains any tag in
// USEFUL_DESTINATION_TYPES. This covers:
//   - businesses (establishment / point_of_interest marker tags,
//     inherited by restaurants, cafes, stores, bars, pharmacies, etc.)
//   - transit hubs (airports, train/subway/bus/rail stations, ferries)
//   - public amenities (libraries, hospitals, universities, schools,
//     parks, stadiums, museums, tourist attractions, shopping malls,
//     gas stations, rest stops, community/convention centers, gyms)
//   - entertainment (amusement parks, zoos, aquariums, movie theaters)
//   - civic/government (city halls, courthouses, post offices, visitor
//     centers)
//   - places of worship (churches, mosques, synagogues, temples)
//
// Pure address / route / locality / postal_code / political / country /
// neighborhood / plus_code predictions never carry any of these tags
// and are therefore excluded.
const USEFUL_DESTINATION_TYPES = new Set<string>([
  // Broad business markers — catches all commercial POIs
  'establishment',
  'point_of_interest',
  // Transit
  'airport',
  'train_station',
  'subway_station',
  'transit_station',
  'bus_station',
  'light_rail_station',
  'ferry_terminal',
  'rest_stop',
  // Public amenities
  'library',
  'hospital',
  'university',
  'school',
  'park',
  'stadium',
  'museum',
  'tourist_attraction',
  'shopping_mall',
  'gas_station',
  'community_center',
  'convention_center',
  'event_venue',
  'visitor_center',
  'gym',
  'campground',
  'rv_park',
  // Entertainment
  'amusement_park',
  'zoo',
  'aquarium',
  'movie_theater',
  // Civic / government
  'city_hall',
  'courthouse',
  'post_office',
  // Places of worship
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
]);
const BIAS_RADIUS_METERS = 10_000;
const MIN_QUERY_LENGTH = 2;
// Cap returned to the client after server-side filtering. Google typically
// returns up to 5 predictions; after our destination filter drops
// non-POI results, we keep up to 5 of whatever survives.
const MAX_RESULTS = 5;

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

    if (query.length < MIN_QUERY_LENGTH) {
      return jsonResponse(400, {
        error: `Search at least ${MIN_QUERY_LENGTH} characters before requesting suggestions.`,
      });
    }

    if (sessionToken.length < 8) {
      return jsonResponse(400, {
        error: 'A valid session token is required.',
      });
    }

    const body: Record<string, unknown> = {
      input: query,
      sessionToken,
      includeQueryPredictions: false,
    };

    if (origin) {
      body.origin = origin;
      body.locationBias = {
        circle: {
          center: origin,
          radius: BIAS_RADIUS_METERS,
        },
      };
    }

    const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.types,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.distanceMeters',
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
      // Useful-destination filter: keep any prediction whose types array
      // contains at least one tag in USEFUL_DESTINATION_TYPES. Pure
      // address / route / locality / postal_code / political predictions
      // never carry any of these tags and are dropped cleanly.
      .filter(
        (prediction) =>
          Array.isArray(prediction.types) &&
          prediction.types.some((type) => USEFUL_DESTINATION_TYPES.has(type))
      )
      .map((prediction) => ({
        place_id: prediction.placeId ?? '',
        text: prediction.text?.text ?? '',
        primary_text: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
        secondary_text: prediction.structuredFormat?.secondaryText?.text ?? null,
        distance_meters: typeof prediction.distanceMeters === 'number' ? prediction.distanceMeters : null,
      }))
      .slice(0, MAX_RESULTS);

    return jsonResponse(200, predictions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Google business suggestions.';

    console.error('[google-place-autocomplete]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
