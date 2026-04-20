/**
 * Urgency DAU detection (Guide Section 10). Classifies a user as "urgent" when
 * three signals fire inside a 60-second window: app_opened → bathroom_searched
 * → bathroom_viewed. On transition emits the `urgency_session` event exactly
 * once per window so downstream analytics can bucket it.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useEventEmitter } from '@/hooks/useEventEmitter';

const WINDOW_MS = 60_000;

interface UrgencySignals {
  appOpenedAt: number | null;
  searchedAt: number | null;
  viewedAt: number | null;
  emittedAt: number | null;
}

function createEmpty(): UrgencySignals {
  return { appOpenedAt: null, searchedAt: null, viewedAt: null, emittedAt: null };
}

export interface UseUrgencyDetectionResult {
  onAppOpen: () => void;
  onSearch: (query?: string | null) => void;
  onBathroomViewed: (bathroomId: string | null | undefined) => void;
  reset: () => void;
}

export function useUrgencyDetection(): UseUrgencyDetectionResult {
  const { emit } = useEventEmitter();
  const signalsRef = useRef<UrgencySignals>(createEmpty());

  const evaluate = useCallback(() => {
    const now = Date.now();
    const signals = signalsRef.current;
    const open = signals.appOpenedAt;
    const search = signals.searchedAt;
    const view = signals.viewedAt;

    if (open && search && view) {
      const windowStart = Math.min(open, search, view);
      const windowEnd = Math.max(open, search, view);
      if (
        windowEnd - windowStart <= WINDOW_MS &&
        (!signals.emittedAt || now - signals.emittedAt > WINDOW_MS)
      ) {
        emit({
          eventType: 'urgency_session',
          payload: {
            window_ms: windowEnd - windowStart,
            app_opened_at: new Date(open).toISOString(),
            searched_at: new Date(search).toISOString(),
            viewed_at: new Date(view).toISOString(),
          },
        });
        signalsRef.current = { ...signals, emittedAt: now };
      }
    }
  }, [emit]);

  const onAppOpen = useCallback(() => {
    signalsRef.current = { ...signalsRef.current, appOpenedAt: Date.now() };
    evaluate();
  }, [evaluate]);

  const onSearch = useCallback(() => {
    signalsRef.current = { ...signalsRef.current, searchedAt: Date.now() };
    evaluate();
  }, [evaluate]);

  const onBathroomViewed = useCallback(
    (bathroomId: string | null | undefined) => {
      void bathroomId;
      signalsRef.current = { ...signalsRef.current, viewedAt: Date.now() };
      evaluate();
    },
    [evaluate]
  );

  const reset = useCallback(() => {
    signalsRef.current = createEmpty();
  }, []);

  // Prune stale signals so old app opens don't trigger a months-later urgency.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const signals = signalsRef.current;
      signalsRef.current = {
        appOpenedAt: signals.appOpenedAt && now - signals.appOpenedAt <= WINDOW_MS ? signals.appOpenedAt : null,
        searchedAt: signals.searchedAt && now - signals.searchedAt <= WINDOW_MS ? signals.searchedAt : null,
        viewedAt: signals.viewedAt && now - signals.viewedAt <= WINDOW_MS ? signals.viewedAt : null,
        emittedAt: signals.emittedAt,
      };
    }, WINDOW_MS);
    return () => clearInterval(interval);
  }, []);
  return { onAppOpen, onSearch, onBathroomViewed, reset };
}
