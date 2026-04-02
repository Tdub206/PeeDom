import { describe, expect, it } from '@jest/globals';
import { classifySupabaseError } from '@/lib/supabase-error';

describe('classifySupabaseError', () => {
  it('classifies a network-error message as offline', () => {
    const result = classifySupabaseError(new Error('Network request failed'), 'fallback');
    expect(result.kind).toBe('offline');
    expect(result.shouldClearSession).toBe(false);
  });

  it('classifies a fetch-failure message as offline', () => {
    const result = classifySupabaseError(new Error('Failed to fetch'), 'fallback');
    expect(result.kind).toBe('offline');
  });

  it('classifies a timed-out message as offline', () => {
    const result = classifySupabaseError(new Error('The request timed out'), 'fallback');
    expect(result.kind).toBe('offline');
  });

  it('classifies an AbortError DOMException as offline with a timeout-specific message', () => {
    const abortError = Object.assign(new Error('The operation was aborted.'), {
      name: 'AbortError',
    });
    const result = classifySupabaseError(abortError, 'fallback');
    expect(result.kind).toBe('offline');
    expect(result.title).toBe('Request timed out');
    expect(result.shouldClearSession).toBe(false);
  });

  it('classifies a JWT error as token-expired and flags session clearing', () => {
    const result = classifySupabaseError(new Error('JWT expired'), 'fallback');
    expect(result.kind).toBe('token-expired');
    expect(result.shouldClearSession).toBe(true);
  });

  it('classifies a session-expired message as token-expired', () => {
    const result = classifySupabaseError(new Error('Auth session missing!'), 'fallback');
    expect(result.kind).toBe('token-expired');
    expect(result.shouldClearSession).toBe(true);
  });

  it('classifies an RLS violation as rls-violation and flags session clearing', () => {
    const result = classifySupabaseError(new Error('permission denied for table bathrooms'), 'fallback');
    expect(result.kind).toBe('rls-violation');
    expect(result.shouldClearSession).toBe(true);
  });

  it('classifies a not-found error without clearing the session', () => {
    const result = classifySupabaseError(new Error('No rows found'), 'fallback');
    expect(result.kind).toBe('not-found');
    expect(result.shouldClearSession).toBe(false);
    expect(result.message).toBe('fallback');
  });

  it('classifies an unrecognised error as unknown and surfaces the raw message', () => {
    const result = classifySupabaseError(new Error('Something unexpected happened'), 'fallback');
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('Something unexpected happened');
    expect(result.shouldClearSession).toBe(false);
  });

  it('falls back to the provided fallback message for non-Error values', () => {
    const result = classifySupabaseError({ weird: 'object' }, 'use this instead');
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('use this instead');
  });

  it('classifies a plain string as an error message', () => {
    const result = classifySupabaseError('Network error occurred', 'fallback');
    expect(result.kind).toBe('offline');
  });
});
