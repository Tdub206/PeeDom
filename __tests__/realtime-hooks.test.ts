import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/realtime-manager', () => ({
  realtimeManager: {
    subscribe: jest.fn(),
    unregister: jest.fn(),
  },
}));

jest.mock('@/lib/sentry', () => ({
  Sentry: {
    captureException: jest.fn(),
  },
}));

import { isCoordinateWithinViewport } from '@/hooks/useRealtimeBathrooms';
import { getRealtimePresenceSessionId } from '@/hooks/useRealtimePresence';

describe('realtime helpers', () => {
  it('matches coordinates inside and outside the active viewport', () => {
    const viewport = {
      latitude: 47.6062,
      longitude: -122.3321,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    expect(isCoordinateWithinViewport(47.6062, -122.3321, viewport)).toBe(true);
    expect(isCoordinateWithinViewport(47.75, -122.3321, viewport)).toBe(false);
    expect(isCoordinateWithinViewport(47.6062, -122.5, viewport)).toBe(false);
  });

  it('reuses one anonymous presence session id during the current app session', () => {
    const firstId = getRealtimePresenceSessionId();
    const secondId = getRealtimePresenceSessionId();

    expect(firstId).toBe(secondId);
    expect(firstId.startsWith('anon_')).toBe(true);
  });
});
