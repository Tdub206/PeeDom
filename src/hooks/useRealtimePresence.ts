import { useEffect, useState } from 'react';
import { realtimeManager } from '@/lib/realtime-manager';
import type { PresenceSync, BathroomPresenceState } from '@/types/realtime';

let ephemeralPresenceSessionId: string | null = null;

export function getRealtimePresenceSessionId(): string {
  if (!ephemeralPresenceSessionId) {
    ephemeralPresenceSessionId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  return ephemeralPresenceSessionId;
}

interface UseRealtimePresenceOptions {
  bathroomId: string | null;
  userId?: string | null;
}

export function useRealtimePresence({
  bathroomId,
  userId = null,
}: UseRealtimePresenceOptions): PresenceSync | null {
  const [presenceSync, setPresenceSync] = useState<PresenceSync | null>(null);

  useEffect(() => {
    if (!bathroomId) {
      return;
    }

    const resolvedUserId = userId ?? getRealtimePresenceSessionId();
    const channelName = `presence:bathroom:${bathroomId}`;
    const presencePayload: BathroomPresenceState = {
      bathroom_id: bathroomId,
      user_id: resolvedUserId,
      joined_at: new Date().toISOString(),
      is_anonymous: !userId,
    };

    const channel = realtimeManager.subscribe(
      channelName,
      (baseChannel) =>
        baseChannel
          .on('presence', { event: 'sync' }, () => {
            const state = baseChannel.presenceState<BathroomPresenceState>();
            const viewers = Object.values(state).flat();

            setPresenceSync({
              bathroom_id: bathroomId,
              viewer_count: viewers.length,
              viewers,
            });
          })
          .on('presence', { event: 'leave' }, () => {
            const state = baseChannel.presenceState<BathroomPresenceState>();
            const viewers = Object.values(state).flat();

            setPresenceSync({
              bathroom_id: bathroomId,
              viewer_count: viewers.length,
              viewers,
            });
          })
          .on('presence', { event: 'join' }, () => {
            const state = baseChannel.presenceState<BathroomPresenceState>();
            const viewers = Object.values(state).flat();

            setPresenceSync({
              bathroom_id: bathroomId,
              viewer_count: viewers.length,
              viewers,
            });
          }),
      (status, activeChannel) => {
        if (status === 'SUBSCRIBED') {
          void activeChannel.track(presencePayload);
        }
      }
    );

    return () => {
      void channel.untrack().catch(() => undefined);
      void realtimeManager.unregister(channelName);
      setPresenceSync(null);
    };
  }, [bathroomId, userId]);

  return presenceSync;
}
