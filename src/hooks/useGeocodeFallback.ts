import { useEffect, useRef, useState } from 'react';
import { geocodeQuery, GeocodedPlace } from '@/lib/geocode';

/**
 * Forward-geocode a query string with debouncing.
 * Used for both the committed query (empty-results fallback)
 * and the active query (type-ahead location suggestion).
 */
function useGeocode(query: string, debounceMs: number) {
  const [geocoded, setGeocoded] = useState<GeocodedPlace | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const lastQueryRef = useRef('');

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setGeocoded(null);
      setIsGeocoding(false);
      lastQueryRef.current = '';
      return;
    }

    // Skip if the query hasn't meaningfully changed.
    if (trimmed.toLowerCase() === lastQueryRef.current.toLowerCase()) {
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    const timer = setTimeout(() => {
      geocodeQuery(trimmed).then((result) => {
        if (!cancelled) {
          lastQueryRef.current = trimmed;
          setGeocoded(result);
          setIsGeocoding(false);
        }
      }).catch(() => {
        if (!cancelled) {
          lastQueryRef.current = trimmed;
          setGeocoded(null);
          setIsGeocoding(false);
        }
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  return { geocoded, isGeocoding };
}

/**
 * Geocode the committed query (fires immediately after submit).
 * Shows "Jump to <place>" when search results are empty.
 */
export function useGeocodeFallback(committedQuery: string) {
  return useGeocode(committedQuery, 0);
}

/**
 * Geocode the active (typing) query with a 500ms debounce.
 * Shows a location suggestion in the autocomplete dropdown.
 */
export function useGeocodeTypeahead(activeQuery: string) {
  return useGeocode(activeQuery, 500);
}
