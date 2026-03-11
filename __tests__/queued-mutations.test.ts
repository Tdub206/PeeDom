import { describe, expect, it } from '@jest/globals';

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
});
