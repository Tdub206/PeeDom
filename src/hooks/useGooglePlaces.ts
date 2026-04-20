import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchGoogleAddressAutocomplete,
  resolveGooglePlaceAddressSelection,
} from '@/api/google-places';
import type {
  Coordinates,
  GooglePlaceAddressResolutionResult,
  GooglePlaceAutocompleteSuggestion,
} from '@/types';
import {
  createGoogleAutocompleteSessionToken,
  GOOGLE_AUTOCOMPLETE_DEBOUNCE_MS,
  isGoogleAutocompleteEligibleQuery,
} from '@/utils/google-places';

interface UseGoogleAddressAutocompleteOptions {
  query: string;
  origin?: Coordinates | null;
  enabled?: boolean;
}

export function useGoogleAddressAutocomplete({
  query,
  origin,
  enabled = true,
}: UseGoogleAddressAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<GooglePlaceAutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const lastQueryRef = useRef('');
  // Monotonic sequence so a slow in-flight request can never overwrite a
  // newer response. Combined with the per-effect `cancelled` flag this gives
  // us strong stale-response suppression without threading AbortSignal
  // through the supabase functions.invoke transport.
  const requestSequenceRef = useRef(0);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    lastQueryRef.current = '';
    requestSequenceRef.current += 1;
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const shouldSearchGoogle = enabled && isGoogleAutocompleteEligibleQuery(trimmedQuery);

    if (!shouldSearchGoogle) {
      resetSession();
      return;
    }

    if (trimmedQuery.toLowerCase() === lastQueryRef.current.toLowerCase()) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const sessionToken = sessionTokenRef.current ?? createGoogleAutocompleteSessionToken();
      sessionTokenRef.current = sessionToken;
      const requestId = ++requestSequenceRef.current;
      setIsLoading(true);

      fetchGoogleAddressAutocomplete({
        query: trimmedQuery,
        session_token: sessionToken,
        origin,
      })
        .then((result) => {
          if (cancelled || requestId !== requestSequenceRef.current) {
            return;
          }

          lastQueryRef.current = trimmedQuery;
          setSuggestions(result.data);
          setError(result.error);
        })
        .catch((nextError) => {
          if (cancelled || requestId !== requestSequenceRef.current) {
            return;
          }

          lastQueryRef.current = trimmedQuery;
          setSuggestions([]);
          setError(
            nextError instanceof Error
              ? nextError
              : new Error('Unable to load business suggestions right now.')
          );
        })
        .finally(() => {
          if (cancelled || requestId !== requestSequenceRef.current) {
            return;
          }

          setIsLoading(false);
        });
    }, GOOGLE_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, origin, query, resetSession]);

  const resolveSelection = useCallback(
    async (suggestion: GooglePlaceAutocompleteSuggestion): Promise<GooglePlaceAddressResolutionResult> => {
      const sessionToken = sessionTokenRef.current ?? createGoogleAutocompleteSessionToken();
      sessionTokenRef.current = sessionToken;

      const result = await resolveGooglePlaceAddressSelection({
        place_id: suggestion.place_id,
        session_token: sessionToken,
      });

      resetSession();

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to load that place right now.');
      }

      return result.data;
    },
    [resetSession]
  );

  return {
    suggestions,
    isLoading,
    error,
    isEnabled: enabled && isGoogleAutocompleteEligibleQuery(query),
    resetSession,
    resolveSelection,
  };
}
