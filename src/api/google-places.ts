import {
  googlePlaceAddressResolutionSchema,
  googlePlaceAutocompleteSuggestionSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import {
  validateGooglePlaceAddressResolutionInput,
  validateGooglePlaceAutocompleteInput,
} from '@/lib/validators/google-places';
import type {
  GooglePlaceAddressResolutionInput,
  GooglePlaceAddressResolutionResult,
  GooglePlaceAutocompleteInput,
  GooglePlaceAutocompleteSuggestion,
} from '@/types';

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function fetchGoogleAddressAutocomplete(
  input: GooglePlaceAutocompleteInput
): Promise<{ data: GooglePlaceAutocompleteSuggestion[]; error: (Error & { code?: string }) | null }> {
  try {
    const validatedInput = validateGooglePlaceAutocompleteInput(input);
    const { data, error } = await getSupabaseClient().functions.invoke('google-place-autocomplete', {
      body: {
        query: validatedInput.query,
        sessionToken: validatedInput.session_token,
        origin: validatedInput.origin ?? null,
      },
    });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load address suggestions right now.'),
      };
    }

    const parsedSuggestions = parseSupabaseRows(
      googlePlaceAutocompleteSuggestionSchema,
      data,
      'google place autocomplete suggestions',
      'Unable to load address suggestions right now.'
    );

    if (parsedSuggestions.error) {
      return {
        data: [],
        error: parsedSuggestions.error,
      };
    }

    return {
      data: parsedSuggestions.data.map((suggestion) => ({
        place_id: suggestion.place_id,
        text: suggestion.text,
        primary_text: suggestion.primary_text,
        secondary_text: suggestion.secondary_text ?? null,
        distance_meters: suggestion.distance_meters ?? null,
      })),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load address suggestions right now.'),
        'Unable to load address suggestions right now.'
      ),
    };
  }
}

export async function resolveGooglePlaceAddressSelection(
  input: GooglePlaceAddressResolutionInput
): Promise<{ data: GooglePlaceAddressResolutionResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const validatedInput = validateGooglePlaceAddressResolutionInput(input);
    const { data, error } = await getSupabaseClient().functions.invoke('google-place-address', {
      body: {
        placeId: validatedInput.place_id,
        sessionToken: validatedInput.session_token,
      },
    });

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load that address right now.'),
      };
    }

    const parsedPlace = parseSupabaseNullableRow(
      googlePlaceAddressResolutionSchema,
      data,
      'google place address resolution',
      'Unable to load that address right now.'
    );

    if (parsedPlace.error) {
      return {
        data: null,
        error: parsedPlace.error,
      };
    }

    return {
      data: parsedPlace.data
        ? (() => {
            const addressComponents = parsedPlace.data.address_components ?? {
              address_line1: null,
              city: null,
              state: null,
              postal_code: null,
              country_code: null,
            };

            return {
              place_id: parsedPlace.data.place_id,
              formatted_address: parsedPlace.data.formatted_address ?? null,
              location: parsedPlace.data.location,
              viewport: parsedPlace.data.viewport ?? null,
              address_components: {
                address_line1: addressComponents.address_line1 ?? null,
                city: addressComponents.city ?? null,
                state: addressComponents.state ?? null,
                postal_code: addressComponents.postal_code ?? null,
                country_code: addressComponents.country_code ?? null,
              },
            };
          })()
        : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load that address right now.'),
        'Unable to load that address right now.'
      ),
    };
  }
}
