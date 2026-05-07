import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '063_store_rewarded_points.sql'),
  'utf8'
);

describe('store rewarded points migration', () => {
  it('extends rewarded verification and point event contracts for store earn rewards', () => {
    expect(migration).toContain("feature_key in ('code_reveal', 'emergency_lookup', 'earn_points')");
    expect(migration).toContain("'ad_watched'");
    expect(migration).toContain("'points_spent'");
  });

  it('creates the ad watch ledger when older duplicate local migrations were never pushed', () => {
    expect(migration).toContain('create table if not exists public.ad_watch_log');
    expect(migration).toContain('alter table public.ad_watch_log enable row level security');
    expect(migration).toContain('create policy "ad_watch_log_select_own"');
  });

  it('requires reward verification and idempotency before awarding points', () => {
    expect(migration).toContain('drop function if exists public.record_ad_watched_points();');
    expect(migration).toContain('p_reward_verification_token text');
    expect(migration).toContain('p_idempotency_key text');
    expect(migration).toContain("perform public.verify_rewarded_unlock_token('earn_points', null, v_reward_verification_token)");
    expect(migration).toContain('idx_ad_watch_log_user_idempotency_unique');
    expect(migration).toContain('idx_ad_watch_log_verification_token_unique');
  });

  it('keeps the daily rewarded earn cap server-side', () => {
    expect(migration).toContain('v_daily_cap constant integer := 5');
    expect(migration).toContain('v_points_per_ad constant integer := 25');
    expect(migration).toContain("'daily_limit_reached'");
  });
});
