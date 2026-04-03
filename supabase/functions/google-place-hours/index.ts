import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { normalizeGoogleOpeningHours } from '../../../src/utils/google-hours.ts';

interface GooglePlaceHoursRequest {
  placeId?: string;
}

interface GooglePlacePoint {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GooglePlacePeriod {
  open?: GooglePlacePoint;
  close?: GooglePlacePoint;
}

interface GooglePlaceOpeningHours {
  openNow?: boolean;
  periods?: GooglePlacePeriod[];
}

interface GooglePlaceResponse {
  id?: string;
  displayName?: {
    text?: string;
  };
  regularOpeningHours?: GooglePlaceOpeningHours;
  currentOpeningHours?: GooglePlaceOpeningHours;
  utcOffsetMinutes?: number;
  timeZone?: {
    id?: string;
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
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
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY');
    const googlePlacesApiKey = getRequiredEnv('GOOGLE_PLACES_API_KEY');
    const authorization = request.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, {
        error: 'Unauthorized.',
      });
    }

    const payload = (await request.json()) as GooglePlaceHoursRequest;
    const placeId = payload.placeId?.trim() ?? '';

    if (placeId.length < 6) {
      return jsonResponse(400, {
        error: 'A valid Google Place ID is required.',
      });
    }

    const googleResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask':
          'id,displayName,regularOpeningHours,currentOpeningHours,utcOffsetMinutes,timeZone',
      },
    });

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      throw new Error(`Google Places responded with ${googleResponse.status}: ${errorBody}`);
    }

    const place = (await googleResponse.json()) as GooglePlaceResponse;
    const openingHours = place.regularOpeningHours ?? place.currentOpeningHours;
    const hours = normalizeGoogleOpeningHours(openingHours);

    if (!Object.keys(hours).length) {
      return jsonResponse(422, {
        error: 'Google did not return weekly opening hours for this place.',
      });
    }

    return jsonResponse(200, {
      provider: 'google_places',
      place_name: place.displayName?.text ?? null,
      google_place_id: place.id ?? placeId,
      time_zone: place.timeZone?.id ?? null,
      utc_offset_minutes:
        typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes : null,
      open_now: Boolean(place.currentOpeningHours?.openNow),
      hours,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch Google hours.';

    console.error('[google-place-hours]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
