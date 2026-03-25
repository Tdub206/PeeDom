import { describe, expect, it } from '@jest/globals';

import { readSupabaseRuntimeConfig } from '@/lib/supabase-config';
import { classifySupabaseError } from '@/lib/supabase-error';

describe('readSupabaseRuntimeConfig', () => {
  it('reports missing environment variables', () => {
    const config = readSupabaseRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });

    expect(config.isConfigured).toBe(false);
    expect(config.missingKeys).toEqual(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);
  });

  it('returns a configured state when both public Supabase variables exist', () => {
    const config = readSupabaseRuntimeConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(config.isConfigured).toBe(true);
    expect(config.errorMessage).toBeNull();
  });
});

describe('classifySupabaseError', () => {
  it('maps offline failures to a recoverable offline state', () => {
    const details = classifySupabaseError(new Error('Network request failed'), 'fallback');

    expect(details.kind).toBe('offline');
    expect(details.shouldClearSession).toBe(false);
  });

  it('marks token failures for session clearing', () => {
    const details = classifySupabaseError(new Error('JWT expired'), 'fallback');

    expect(details.kind).toBe('token-expired');
    expect(details.shouldClearSession).toBe(true);
  });

  it('marks RLS failures for session clearing', () => {
    const details = classifySupabaseError(new Error('new row violates row-level security policy'), 'fallback');

    expect(details.kind).toBe('rls-violation');
    expect(details.shouldClearSession).toBe(true);
  });
});
