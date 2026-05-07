import type { Coordinates } from '@/types';

export const EMERGENCY_COORDINATE_MAX_AGE_MS = 2 * 60 * 1000;

export function isEmergencyLocationFresh(
  coordinates: Coordinates | null,
  coordinatesUpdatedAt: string | null,
  nowMs: number = Date.now(),
): coordinates is Coordinates {
  if (!coordinates || !coordinatesUpdatedAt) {
    return false;
  }

  const updatedAtMs = Date.parse(coordinatesUpdatedAt);

  if (!Number.isFinite(updatedAtMs)) {
    return false;
  }

  return updatedAtMs <= nowMs && nowMs - updatedAtMs <= EMERGENCY_COORDINATE_MAX_AGE_MS;
}
