import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager } from '@/lib/realtime-manager';
import { Sentry } from '@/lib/sentry';
import type { BathroomListItem, RegionBounds } from '@/types';
import type {
  BathroomChangePayload,
  BathroomStatusChangePayload,
  CleanlinessRatingChangePayload,
  CodeChangePayload,
} from '@/types/realtime';

interface UseRealtimeBathroomsOptions {
  viewport: RegionBounds | null;
  visibleBathrooms: BathroomListItem[];
  enabled?: boolean;
}

export function isCoordinateWithinViewport(
  latitude: number,
  longitude: number,
  viewport: RegionBounds | null
): boolean {
  if (!viewport) {
    return true;
  }

  const minLatitude = viewport.latitude - viewport.latitudeDelta / 2;
  const maxLatitude = viewport.latitude + viewport.latitudeDelta / 2;
  const minLongitude = viewport.longitude - viewport.longitudeDelta / 2;
  const maxLongitude = viewport.longitude + viewport.longitudeDelta / 2;

  return (
    latitude >= minLatitude &&
    latitude <= maxLatitude &&
    longitude >= minLongitude &&
    longitude <= maxLongitude
  );
}

export function useRealtimeBathrooms({
  viewport,
  visibleBathrooms,
  enabled = true,
}: UseRealtimeBathroomsOptions): void {
  const queryClient = useQueryClient();
  const viewportRef = useRef<RegionBounds | null>(viewport);
  const visibleBathroomIdsRef = useRef<Set<string>>(new Set(visibleBathrooms.map((bathroom) => bathroom.id)));

  viewportRef.current = viewport;
  visibleBathroomIdsRef.current = new Set(visibleBathrooms.map((bathroom) => bathroom.id));

  const invalidateBathrooms = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['bathrooms'],
      refetchType: 'active',
    });
  }, [queryClient]);

  const handleBathroomsChange = useCallback(
    (payload: BathroomChangePayload) => {
      const candidateRow = payload.new ?? payload.old;

      if (!candidateRow) {
        return;
      }

      if (
        typeof candidateRow.latitude !== 'number' ||
        typeof candidateRow.longitude !== 'number' ||
        candidateRow.moderation_status !== 'active'
      ) {
        return;
      }

      if (!isCoordinateWithinViewport(candidateRow.latitude, candidateRow.longitude, viewportRef.current)) {
        return;
      }

      invalidateBathrooms();
    },
    [invalidateBathrooms]
  );

  const handleBathroomScopedChange = useCallback(
    (payload: CodeChangePayload | CleanlinessRatingChangePayload | BathroomStatusChangePayload) => {
      const bathroomId = payload.new?.bathroom_id ?? payload.old?.bathroom_id;

      if (!bathroomId || !visibleBathroomIdsRef.current.has(bathroomId)) {
        return;
      }

      invalidateBathrooms();
    },
    [invalidateBathrooms]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channelName = 'bathrooms:map-view';

    realtimeManager.subscribe(channelName, (channel) => {
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathrooms',
          },
          (payload) => {
            try {
              handleBathroomsChange(payload as unknown as BathroomChangePayload);
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_access_codes',
          },
          (payload) => {
            try {
              handleBathroomScopedChange(payload as unknown as CodeChangePayload);
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cleanliness_ratings',
          },
          (payload) => {
            try {
              handleBathroomScopedChange(payload as unknown as CleanlinessRatingChangePayload);
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bathroom_status_events',
          },
          (payload) => {
            try {
              handleBathroomScopedChange(payload as unknown as BathroomStatusChangePayload);
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        );
    });

    return () => {
      void realtimeManager.unregister(channelName);
    };
  }, [enabled, handleBathroomScopedChange, handleBathroomsChange]);
}
