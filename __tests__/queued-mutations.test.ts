import { describe, expect, it } from '@jest/globals';

import { isBathroomLiveStatusEventMutationPayload } from '@/lib/live-status-event-queue';
import { shouldDropQueuedMutation } from '@/lib/offline-queue';
import { queuedMutationsSchema } from '@/utils/validate';

describe('queuedMutationsSchema', () => {
  it('accepts valid queued favorite mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_1',
        type: 'favorite_add',
        payload: {
          bathroom_id: 'bathroom-1',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-1',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('accepts valid queued report mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_2',
        type: 'report_create',
        payload: {
          bathroom_id: 'bathroom-2',
          report_type: 'closed',
          notes: null,
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-2',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('accepts valid queued code submission mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_3',
        type: 'code_submit',
        payload: {
          bathroom_id: 'bathroom-3',
          code_value: '2468#',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-3',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('accepts valid queued cleanliness rating mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_4',
        type: 'rating_create',
        payload: {
          bathroom_id: 'bathroom-4',
          rating: 5,
          notes: 'Very clean.',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-4',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('accepts valid queued live status mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_5',
        type: 'status_report',
        payload: {
          bathroom_id: 'bathroom-5',
          status: 'dirty',
          note: 'Paper towels were empty.',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-5',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('accepts queued rich live status event mutations', () => {
    const payload = {
      bathroom_id: 'bathroom-5',
      status_type: 'line',
      status_value: 'long_wait',
      wait_minutes: 15,
      supplies_missing: [],
    };
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_5b',
        type: 'live_status_event',
        payload,
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-5',
      },
    ]);

    expect(result.success).toBe(true);
    expect(isBathroomLiveStatusEventMutationPayload(payload)).toBe(true);
  });

  it('rejects malformed rich live status event payloads before replay', () => {
    expect(
      isBathroomLiveStatusEventMutationPayload({
        bathroom_id: 'bathroom-5',
        status_type: 'line',
        status_value: 'long_wait',
        wait_minutes: -1,
      })
    ).toBe(false);
    expect(
      isBathroomLiveStatusEventMutationPayload({
        bathroom_id: 'bathroom-5',
        status_type: 'unknown_status_type',
        status_value: 'long_wait',
      })
    ).toBe(false);
  });

  it('accepts valid queued accessibility update mutations', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_6',
        type: 'accessibility_update',
        payload: {
          bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
          has_grab_bars: true,
          door_width_inches: 34,
          notes: 'Automatic opener at the main entrance.',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: 0,
        last_attempt_at: null,
        user_id: 'user-6',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('rejects malformed queued mutations before they enter the offline queue', () => {
    const result = queuedMutationsSchema.safeParse([
      {
        id: 'mutation_1',
        type: 'favorite_add',
        payload: {
          bathroom_id: 'bathroom-1',
        },
        created_at: '2026-03-10T12:00:00.000Z',
        retry_count: -1,
        last_attempt_at: null,
      },
    ]);

    expect(result.success).toBe(false);
  });

  it('keeps a queued mutation through three failed replays and drops it on the fourth', () => {
    expect(shouldDropQueuedMutation(1)).toBe(false);
    expect(shouldDropQueuedMutation(2)).toBe(false);
    expect(shouldDropQueuedMutation(3)).toBe(false);
    expect(shouldDropQueuedMutation(4)).toBe(true);
  });
});
