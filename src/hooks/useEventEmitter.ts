import { useCallback, useEffect } from 'react';
import type { StallPassEventName, StallPassEventPayload } from '@/types';
import {
  enqueueStallPassEvent,
  flushStallPassEventQueue,
  resetStallPassEventSession,
} from '@/lib/stallpass-event-queue';

export function useEventEmitter() {
  useEffect(() => {
    return () => {
      void flushStallPassEventQueue().catch(() => undefined);
    };
  }, []);

  const emitEvent = useCallback(
    async (name: StallPassEventName, payload: StallPassEventPayload = {}) => {
      return enqueueStallPassEvent(name, payload);
    },
    []
  );

  const flushEvents = useCallback(async () => {
    return flushStallPassEventQueue();
  }, []);

  const resetSession = useCallback(() => {
    resetStallPassEventSession();
  }, []);

  return {
    emitEvent,
    flushEvents,
    resetSession,
  };
}
