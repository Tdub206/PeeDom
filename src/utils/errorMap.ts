import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

const AUTH_MESSAGE_MAP: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /invalid login credentials|invalid credentials/i,
    message: 'That email and password combination did not match our records.',
  },
  {
    pattern: /email not confirmed/i,
    message: 'Confirm your email address before signing in.',
  },
  {
    pattern: /already registered|user already registered/i,
    message: 'An account with that email already exists. Try signing in instead.',
  },
  {
    pattern: /password should be at least/i,
    message: 'Use a stronger password with at least 8 characters.',
  },
  {
    pattern: /rate limit/i,
    message: 'Too many attempts were made. Wait a moment and try again.',
  },
  {
    pattern: /network/i,
    message: 'The network request failed. Check your connection and try again.',
  },
];

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof AuthError) {
    const mapped = AUTH_MESSAGE_MAP.find((entry) => entry.pattern.test(error.message));
    return mapped?.message ?? error.message;
  }

  if (error instanceof Error && error.message) {
    const mapped = AUTH_MESSAGE_MAP.find((entry) => entry.pattern.test(error.message));
    return mapped?.message ?? error.message;
  }

  return fallback;
}
