import { useCallback, useRef } from 'react';
import { createSignalIdentifier } from '@/lib/stallpass-signals';
import { useEventEmitter } from '@/hooks/useEventEmitter';

interface StartUrgencySessionOptions {
  bathroomId?: string | null;
  source: string;
  screenName: string;
}

interface FinishUrgencySessionOptions {
  bathroomId?: string | null;
  outcome: string;
  screenName: string;
}

export function useUrgencyDetection() {
  const { emitEvent } = useEventEmitter();
  const activeUrgencySessionIdRef = useRef<string | null>(null);

  const startUrgencySession = useCallback(
    async (options: StartUrgencySessionOptions) => {
      if (!activeUrgencySessionIdRef.current) {
        activeUrgencySessionIdRef.current = createSignalIdentifier('urgency');
      }

      await emitEvent('urgency_session', {
        bathroom_id: options.bathroomId ?? null,
        screen_name: options.screenName,
        session_stage: 'started',
        source: options.source,
        urgency_session_id: activeUrgencySessionIdRef.current,
      });

      return activeUrgencySessionIdRef.current;
    },
    [emitEvent]
  );

  const finishUrgencySession = useCallback(
    async (options: FinishUrgencySessionOptions) => {
      if (!activeUrgencySessionIdRef.current) {
        return null;
      }

      const currentUrgencySessionId = activeUrgencySessionIdRef.current;
      activeUrgencySessionIdRef.current = null;

      await emitEvent('urgency_session', {
        bathroom_id: options.bathroomId ?? null,
        screen_name: options.screenName,
        session_stage: 'finished',
        outcome: options.outcome,
        urgency_session_id: currentUrgencySessionId,
      });

      return currentUrgencySessionId;
    },
    [emitEvent]
  );

  return {
    finishUrgencySession,
    startUrgencySession,
  };
}
