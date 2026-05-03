import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('AdMob server-side reward verification function', () => {
  it('verifies Google signatures before inserting reward verification rows', () => {
    const source = readRepoFile('supabase/functions/admob-reward-ssv/index.ts');

    expect(source).toContain('https://www.gstatic.com/admob/reward/verifier-keys.json');
    expect(source).toContain('crypto.subtle.verify');
    expect(source).toContain('convertDerEcdsaSignatureToRaw');
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).toContain('rewarded_unlock_verifications');
    expect(source).toContain('ADMOB_REWARDED_AD_UNIT_IDS');
  });

  it('parses StallPass custom_data tokens for code reveals and emergency lookups', () => {
    const source = readRepoFile('supabase/functions/admob-reward-ssv/index.ts');

    expect(source).toContain("featureKey: 'code_reveal'");
    expect(source).toContain("featureKey: 'emergency_lookup'");
    expect(source).toContain('params.get(\'custom_data\')');
    expect(source).toContain('params.get(\'user_id\')');
  });

  it('exposes an authenticated polling RPC for unconsumed verified rewards', () => {
    const migration = readRepoFile('supabase/migrations/058_rewarded_unlock_verification_polling.sql');

    expect(migration).toContain('create or replace function public.has_rewarded_unlock_verification');
    expect(migration).toContain('verifications.user_id = auth.uid()');
    expect(migration).toContain('verifications.consumed_at is null');
    expect(migration).toContain("grant execute on function public.has_rewarded_unlock_verification(text, uuid, text) to authenticated");
  });
});
