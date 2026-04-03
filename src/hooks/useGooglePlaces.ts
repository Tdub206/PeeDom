import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchGoogleAddressAutocomplete,
  resolveGooglePlaceAddressSelection,
} from '@/api/google-places';
import type {
  Coordinates,
  GooglePlaceAddressResolutionResult,
  GooglePlaceAutocompleteSuggestion,
  RegionBounds,
} from '@/types';
import {
  createGoogleAutocompleteSessionToken,
  GOOGLE_ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
  isAddressLikeSearchQuery,
} from '@/utils/google-places';

interface UseGoogleAddressAutocompleteOptions {
  query: string;
  origin?: Coordinates | null;
  region?: RegionBounds | null;
}

export function useGoogleAddressAutocomplete({
  query,
  origin,
  region,
}: UseGoogleAddressAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<GooglePlaceAutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const lastQueryRef = useRef('');

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    lastQueryRef.current = '';
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const shouldSearchGoogle = isAddressLikeSearchQuery(trimmedQuery);

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
      setIsLoading(true);

      fetchGoogleAddressAutocomplete({
        query: trimmedQuery,
        session_token: sessionToken,
        origin,
        region,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          lastQueryRef.current = trimmedQuery;
          setSuggestions(result.data);
          setError(result.error);
        })
        .catch((nextError) => {
          if (cancelled) {
            return;
          }

          lastQueryRef.current = trimmedQuery;
          setSuggestions([]);
          setError(
            nextError instanceof Error
              ? nextError
              : new Error('Unable to load address suggestions right now.')
          );
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, GOOGLE_ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [origin, query, region, resetSession]);

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
        throw result.error ?? new Error('Unable to load that address right now.');
      }

      return result.data;
    },
    [resetSession]
  );

  return {
    suggestions,
    isLoading,
    error,
    isEnabled: isAddressLikeSearchQuery(query),
    resetSession,
    resolveSelection,
  };
}
