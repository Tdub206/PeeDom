import { describe, expect, it } from '@jest/globals';

import { buildCodeUnlockExpiry, sanitizeCodeUnlockMap } from '@/lib/code-unlock-state';

describe('buildCodeUnlockExpiry', () => {
  it('defaults to a 24 hour unlock window when no code expiry exists', () => {
    const now = new Date('2026-03-15T08:00:00.000Z');

    expect(buildCodeUnlockExpiry(now)).toBe('2026-03-16T08:00:00.000Z');
  });

  it('caps the unlock window to the code expiry when the code expires sooner', () => {
    const now = new Date('2026-03-15T08:00:00.000Z');

    expect(buildCodeUnlockExpiry(now, '2026-03-15T12:30:00.000Z')).toBe('2026-03-15T12:30:00.000Z');
  });

  it('falls back to the default unlock window when the code expiry is invalid or already expired', () => {
    const now = new Date('2026-03-15T08:00:00.000Z');

    expect(buildCodeUnlockExpiry(now, 'not-a-date')).toBe('2026-03-16T08:00:00.000Z');
    expect(buildCodeUnlockExpiry(now, '2026-03-15T07:59:59.000Z')).toBe('2026-03-16T08:00:00.000Z');
  });
});

describe('sanitizeCodeUnlockMap', () => {
  it('drops malformed and expired unlock records', () => {
    const now = new Date('2026-03-15T08:00:00.000Z');

    const sanitized = sanitizeCodeUnlockMap(
      {
        active: {
          bathroom_id: 'active',
          unlocked_at: '2026-03-15T07:00:00.000Z',
          expires_at: '2026-03-15T09:00:00.000Z',
        },
        expired: {
          bathroom_id: 'expired',
          unlocked_at: '2026-03-15T05:00:00.000Z',
          expires_at: '2026-03-15T07:59:59.000Z',
        },
        malformed: {
          bathroom_id: '',
          unlocked_at: 'not-a-date',
          expires_at: '2026-03-15T09:00:00.000Z',
        },
      },
      now
    );

    expect(sanitized).toEqual({
      active: {
        bathroom_id: 'active',
        unlocked_at: '2026-03-15T07:00:00.000Z',
        expires_at: '2026-03-15T09:00:00.000Z',
      },
    });
  });
});
