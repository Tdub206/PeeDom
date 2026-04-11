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

const DATABASE_CODE_MESSAGE_MAP: Record<string, string> = {
  '23505': "You've already done that.",
  '23503': 'That bathroom no longer exists.',
  PGRST116: "We couldn't find that item.",
  '42501': "You don't have permission to do that.",
  AUTH_REQUIRED: 'Sign in to continue with that action.',
  CODE_REVEAL_NOT_GRANTED: 'Complete a rewarded unlock before revealing this bathroom code.',
  CODE_NOT_AVAILABLE: 'There is no active community code to reveal for this bathroom right now.',
  INSUFFICIENT_POINTS: 'You need more contribution points before redeeming premium access.',
  INVALID_REDEMPTION_PERIOD: 'Choose a valid premium redemption period.',
  NETWORK_ERROR: 'No connection. Your action has been saved for later.',
  PROFILE_NOT_FOUND: 'Your StallPass profile could not be loaded right now.',
  SELF_CODE_VOTE: "You can't verify a bathroom code that you submitted yourself.",
  INVALID_BATHROOM_NAME: 'Add a bathroom name that is at least 2 characters long.',
  BATHROOM_LOCATION_DETAILS_REQUIRED: 'Add at least a street address or city details before submitting this bathroom.',
  INVALID_BATHROOM_COORDINATES: 'Use valid latitude and longitude values for this bathroom.',
  BATHROOM_SUBMISSION_LIMIT_REACHED: 'You can add up to 5 bathrooms in a 24-hour period.',
  DUPLICATE_BATHROOM_NEARBY: 'A bathroom already exists within about 50 meters of this location.',
  BATHROOM_NOT_FOUND: "We couldn't find that bathroom anymore.",
  INVALID_CODE_VALUE: 'Use 2 to 32 characters for the access code.',
  CODE_SUBMISSION_COOLDOWN: 'You already submitted a code for this bathroom recently. Please wait before sending another.',
  INVALID_CODE_VOTE: 'Choose whether the code worked or failed before submitting your vote.',
  INVALID_REPORT_TYPE: 'Choose a valid report type for this bathroom.',
  INVALID_REPORT_NOTES: 'Report details must be 500 characters or fewer.',
  REPORT_ALREADY_OPEN: "You've already filed that type of report for this bathroom.",
  INVALID_CLEANLINESS_RATING: 'Choose a cleanliness rating between 1 and 5.',
  INVALID_CLEANLINESS_NOTES: 'Cleanliness notes must be 300 characters or fewer.',
};

interface ErrorLike {
  code?: string;
  message?: string;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as ErrorLike).code ?? '');
    if (code && DATABASE_CODE_MESSAGE_MAP[code]) {
      return DATABASE_CODE_MESSAGE_MAP[code];
    }
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
