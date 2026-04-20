/**
 * Thin React hook over the event batch store. Wires the dispatcher to the
 * access-intelligence API lazily, generates a per-session id, and auto-flushes
 * while mounted.
 *
 * Usage:
 *   const { emit } = useEventEmitter();
 *   emit({ eventType: 'bathroom_viewed', bathroomId });
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEventBatchStore } from '@/store/eventBatchStore';
import { logAccessIntelligenceEventsBatch } from '@/api/access-intelligence';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import type { AccessIntelligenceEventInput } from '@/types/access-intelligence';

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
}

export interface UseEventEmitterResult {
  emit: (event: Omit<AccessIntelligenceEventInput, 'sessionId' | 'deviceFingerprint'>) => void;
  flush: () => Promise<number>;
  sessionId: string;
  deviceFingerprint: string | null;
}

export function useEventEmitter(): UseEventEmitterResult {
  const { fingerprint } = useDeviceFingerprint();
  const sessionIdRef = useRef<string>(generateSessionId());
  const setDispatcher = useEventBatchStore((state) => state.setDispatcher);
  const enqueue = useEventBatchStore((state) => state.enqueue);
  const flush = useEventBatchStore((state) => state.flush);
  const startAutoFlush = useEventBatchStore((state) => state.startAutoFlush);
  const stopAutoFlush = useEventBatchStore((state) => state.stopAutoFlush);

  useEffect(() => {
    setDispatcher(async (events) => {
      const result = await logAccessIntelligenceEventsBatch(events);
      if (result.error) {
        throw result.error;
      }
      return result.data ?? { inserted: 0 };
    });
    startAutoFlush();

    return () => {
      stopAutoFlush();
      setDispatcher(null);
    };
  }, [setDispatcher, startAutoFlush, stopAutoFlush]);

  const emit = useCallback(
    (event: Omit<AccessIntelligenceEventInput, 'sessionId' | 'deviceFingerprint'>) => {
      enqueue({
        ...event,
        sessionId: sessionIdRef.current,
        deviceFingerprint: fingerprint,
      });
    },
    [enqueue, fingerprint]
  );

  return useMemo(
    () => ({
      emit,
      flush,
      sessionId: sessionIdRef.current,
      deviceFingerprint: fingerprint,
    }),
    [emit, flush, fingerprint]
  );
}
