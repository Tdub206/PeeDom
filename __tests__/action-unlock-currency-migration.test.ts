import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const actionUnlockMigration = readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '046_action_unlock_currency.sql'),
  'utf8'
);

describe('action unlock currency migration', () => {
  it('adds server-backed starter unlock timestamps to profiles', () => {
    expect(actionUnlockMigration).toContain('add column if not exists free_code_reveal_used_at timestamptz');
    expect(actionUnlockMigration).toContain('add column if not exists free_emergency_lookup_used_at timestamptz');
  });

  it('extends unlock grants and point events for one-off unlock spending', () => {
    expect(actionUnlockMigration).toContain("'starter_free'");
    expect(actionUnlockMigration).toContain("'points_redeemed'");
    expect(actionUnlockMigration).toContain("'code_reveal_redeemed'");
    expect(actionUnlockMigration).toContain("'emergency_lookup_redeemed'");
  });

  it('defines both code reveal and emergency unlock RPCs', () => {
    expect(actionUnlockMigration).toContain('create function public.grant_bathroom_code_reveal_access');
    expect(actionUnlockMigration).toContain('create or replace function public.consume_emergency_lookup_access');
    expect(actionUnlockMigration).toContain('public.spend_points_for_action_unlock');
  });
});
