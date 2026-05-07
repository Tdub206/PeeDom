import fs from 'fs';
import path from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('restroom intelligence API', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('sets a default saved need profile through the atomic RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: 'profile-1',
        user_id: 'user-1',
        name: 'IBD urgency',
        preset_key: 'ibd_urgency',
        filters: {},
        is_default: true,
        created_at: '2026-05-03T12:00:00.000Z',
        updated_at: '2026-05-03T12:00:00.000Z',
      },
      error: null,
    });

    const { setDefaultSavedNeedProfile } = await import('@/api/restroom-intelligence');
    const result = await setDefaultSavedNeedProfile({
      profileId: 'profile-1',
      userId: 'user-1',
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('set_default_saved_need_profile', {
      p_profile_id: 'profile-1',
    });
  });

  it('keeps default profile updates transactional in the migration', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/061_saved_need_profile_default_rpc.sql'),
      'utf8'
    );

    expect(migration).toContain('create or replace function public.set_default_saved_need_profile');
    expect(migration).toContain('for update');
    expect(migration).toContain('is_default = false');
    expect(migration).toContain('is_default = true');
  });
});
