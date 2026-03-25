import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';

interface UseRealtimeCodeOptions {
  bathroomId: string | null;
  onChange?: () => Promise<void> | void;
}

export function useRealtimeCode({ bathroomId, onChange }: UseRealtimeCodeOptions): void {
  useEffect(() => {
    if (!bathroomId) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`bathroom-code:${bathroomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bathroom_access_codes',
          filter: `bathroom_id=eq.${bathroomId}`,
        },
        () => {
          if (!onChange) {
            return;
          }

          void Promise.resolve(onChange()).catch((error) => {
            Sentry.captureException(error);
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          Sentry.captureException(new Error(`Realtime code subscription failed for bathroom ${bathroomId}.`));
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [bathroomId, onChange]);
}
