import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Sentry } from '@/lib/sentry';

/**
 * Fire-and-forget bathroom view event on mount.
 * Rate-limited server-side to 1 per user per bathroom per hour.
 */
export function useBathroomView(bathroomId: string | null) {
  const { user } = useAuth();
  const hasRecorded = useRef(false);

  useEffect(() => {
    if (!bathroomId || !user?.id || hasRecorded.current) return;
    hasRecorded.current = true;

    void (async () => {
      try {
        await getSupabaseClient().rpc(
          'record_bathroom_view' as never,
          { p_bathroom_id: bathroomId } as never,
        );
      } catch (err) {
        Sentry.captureException(err);
      }
    })();
  }, [bathroomId, user?.id]);
}
