import { AuthError } from '@supabase/supabase-js';

export type SupabaseErrorKind = 'offline' | 'token-expired' | 'rls-violation' | 'not-found' | 'unknown';

export interface SupabaseErrorDetails {
  kind: SupabaseErrorKind;
  message: string;
  shouldClearSession: boolean;
  title: string;
}

const OFFLINE_PATTERN = /network request failed|network error|failed to fetch|offline|timed out|connection/i;
const TOKEN_PATTERN =
  /jwt|token|refresh token|session expired|invalid refresh token|invalid claim|unauthorized|auth session missing/i;
const RLS_PATTERN = /permission denied|violates row-level security|row-level security|forbidden|not allowed/i;
const NOT_FOUND_PATTERN = /no rows|not found/i;

export function classifySupabaseError(
  error: unknown,
  fallbackMessage: string
): SupabaseErrorDetails {
  const rawMessage =
    error instanceof AuthError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : fallbackMessage;

  if (OFFLINE_PATTERN.test(rawMessage)) {
    return {
      kind: 'offline',
      message: 'You appear to be offline. StallPass will keep your last known session and retry when the network returns.',
      shouldClearSession: false,
      title: 'Offline mode',
    };
  }

  if (TOKEN_PATTERN.test(rawMessage)) {
    return {
      kind: 'token-expired',
      message: 'Your session expired. Sign in again to continue using protected features.',
      shouldClearSession: true,
      title: 'Session expired',
    };
  }

  if (RLS_PATTERN.test(rawMessage)) {
    return {
      kind: 'rls-violation',
      message: 'Your account could not access the requested data. Sign in again or contact support if this persists.',
      shouldClearSession: true,
      title: 'Access denied',
    };
  }

  if (NOT_FOUND_PATTERN.test(rawMessage)) {
    return {
      kind: 'not-found',
      message: fallbackMessage,
      shouldClearSession: false,
      title: 'Unavailable',
    };
  }

  return {
    kind: 'unknown',
    message: rawMessage || fallbackMessage,
    shouldClearSession: false,
    title: 'Unexpected error',
  };
}
