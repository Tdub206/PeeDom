import { describe, expect, it } from '@jest/globals';

import { EMERGENCY_COORDINATE_MAX_AGE_MS, isEmergencyLocationFresh } from '@/lib/emergency-location';

const COORDINATES = {
  latitude: 37.7749,
  longitude: -122.4194,
};

describe('isEmergencyLocationFresh', () => {
  it('accepts coordinates updated within the emergency freshness window', () => {
    const nowMs = Date.parse('2026-05-03T12:00:00.000Z');
    const updatedAt = new Date(nowMs - EMERGENCY_COORDINATE_MAX_AGE_MS + 1000).toISOString();

    expect(isEmergencyLocationFresh(COORDINATES, updatedAt, nowMs)).toBe(true);
  });

  it('rejects stale, missing, invalid, or future coordinate timestamps', () => {
    const nowMs = Date.parse('2026-05-03T12:00:00.000Z');

    expect(
      isEmergencyLocationFresh(
        COORDINATES,
        new Date(nowMs - EMERGENCY_COORDINATE_MAX_AGE_MS - 1000).toISOString(),
        nowMs,
      ),
    ).toBe(false);
    expect(isEmergencyLocationFresh(null, new Date(nowMs).toISOString(), nowMs)).toBe(false);
    expect(isEmergencyLocationFresh(COORDINATES, 'not-a-date', nowMs)).toBe(false);
    expect(isEmergencyLocationFresh(COORDINATES, new Date(nowMs + 1000).toISOString(), nowMs)).toBe(false);
  });
});
