import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sentry } from '@/lib/sentry';
import { useEventEmitter } from '@/hooks/useEventEmitter';

/**
 * Fire-and-forget bathroom view event on mount.
 * Rate-limited server-side to 1 per user per bathroom per hour.
 */
export function useBathroomView(bathroomId: string | null) {
  const { user } = useAuth();
  const { emitEvent } = useEventEmitter();
  const hasRecorded = useRef(false);

  useEffect(() => {
    hasRecorded.current = false;
  }, [bathroomId]);

  useEffect(() => {
    if (!bathroomId || !user?.id || hasRecorded.current) return;
    hasRecorded.current = true;

    void (async () => {
      try {
        void emitEvent('bathroom_viewed', {
          bathroom_id: bathroomId,
          screen_name: 'bathroom_detail',
        }).catch(() => undefined);
        await getSupabaseClient().rpc(
          'record_bathroom_view' as never,
          { p_bathroom_id: bathroomId } as never,
        );
      } catch (err) {
        Sentry.captureException(err);
      }
    })();
  }, [bathroomId, emitEvent, user?.id]);
}
