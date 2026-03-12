/**
 * AuthService — Single Supabase Auth + Profile Boundary
 *
 * This is the ONLY file that imports from @supabase/supabase-js for auth.
 * All methods return typed ServiceResult — never raw Supabase responses.
 * AuthProvider maps results into store actions; service returns data only.
 *
 * Removes duplicate logic previously split across src/api/auth.ts and
 * the old AuthContext provider.
 */

import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { authCache } from './auth-cache';
import {
  GetSessionResult,
  SignInResult,
  SignUpResult,
  LoadProfileResult,
  SignOutResult,
  AuthFailureClassification,
} from './auth-types';
import { AuthIssueCode } from '@/store/useAuthStore';

// ── Error classification ──────────────────────────────────────────────────────

const AUTH_ERROR_MESSAGES = [
  'jwt expired',
  'invalid jwt',
  'not authenticated',
  'session_not_found',
  'user not found',
  'invalid refresh token',
  'refresh_token_not_found',
];

const RLS_ERROR_MESSAGES = [
  'row-level security',
  'violates row-level security',
  'insufficient_privilege',
  'permission denied',
];

const NETWORK_ERROR_MESSAGES = [
  'network request failed',
  'fetch failed',
  'failed to fetch',
  'timeout',
  'econnrefused',
  'networkerror',
];

export function classifyAuthFailure(error: unknown): AuthFailureClassification {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (AUTH_ERROR_MESSAGES.some((m) => msg.includes(m))) {
    return {
      code: 'token_expired',
      message: 'Session expired. Please sign in again.',
      isTransient: false,
      isAuthError: true,
    };
  }

  if (RLS_ERROR_MESSAGES.some((m) => msg.includes(m))) {
    return {
      code: 'rls_violation',
      message: 'Permission denied.',
      isTransient: false,
      isAuthError: true,
    };
  }

  if (NETWORK_ERROR_MESSAGES.some((m) => msg.includes(m))) {
    return {
      code: 'network_error',
      message: 'Network unavailable. Please try again.',
      isTransient: true,
      isAuthError: false,
    };
  }

  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    isTransient: false,
    isAuthError: false,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const AuthService = {
  /**
   * Fetch the current Supabase session.
   * Returns null data (not an error) when there is no active session.
   */
  async getSession(): Promise<GetSessionResult> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        const classification = classifyAuthFailure(error);
        return {
          ok: false,
          code: classification.code as AuthIssueCode,
          message: classification.message,
        };
      }

      if (!data.session) {
        return { ok: true, data: null };
      }

      return {
        ok: true,
        data: {
          session: data.session,
          user: data.session.user,
        },
      };
    } catch (error) {
      const classification = classifyAuthFailure(error);
      return {
        ok: false,
        code: classification.code as AuthIssueCode,
        message: classification.message,
      };
    }
  },

  /**
   * Sign in with email and password.
   */
  async signInWithEmail(email: string, password: string): Promise<SignInResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        const classification = classifyAuthFailure(error ?? new Error('No session returned'));
        return {
          ok: false,
          code: classification.code as AuthIssueCode,
          message: error?.message ?? 'Sign in failed.',
        };
      }

      return {
        ok: true,
        data: {
          session: data.session,
          user: data.session.user,
        },
      };
    } catch (error) {
      const classification = classifyAuthFailure(error);
      return {
        ok: false,
        code: classification.code as AuthIssueCode,
        message: classification.message,
      };
    }
  },

  /**
   * Register a new account.
   */
  async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<SignUpResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName ?? email.split('@')[0],
          },
        },
      });

      if (error) {
        const classification = classifyAuthFailure(error);
        return {
          ok: false,
          code: classification.code as AuthIssueCode,
          message: error.message,
        };
      }

      // Supabase returns a session immediately if email confirmation is disabled,
      // and user.confirmed_at is null if confirmation is pending.
      const needsEmailConfirmation = !data.session;
      return { ok: true, data: { needsEmailConfirmation } };
    } catch (error) {
      const classification = classifyAuthFailure(error);
      return {
        ok: false,
        code: classification.code as AuthIssueCode,
        message: classification.message,
      };
    }
  },

  /**
   * Sign the user out.
   */
  async signOut(): Promise<SignOutResult> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return {
          ok: false,
          code: 'unknown',
          message: error.message,
        };
      }
      return { ok: true, data: undefined };
    } catch (error) {
      const classification = classifyAuthFailure(error);
      return {
        ok: false,
        code: classification.code as AuthIssueCode,
        message: classification.message,
      };
    }
  },

  /**
   * Load the user's profile from the database.
   *
   * @param userId — the authenticated user's UUID
   * @param options.allowCachedProfile — if true, returns a cached profile on
   *   network failure instead of returning an error. refreshUser() always
   *   passes false for this option (spec §2 rule 7).
   */
  async loadProfile(
    userId: string,
    options: { allowCachedProfile: boolean } = { allowCachedProfile: false }
  ): Promise<LoadProfileResult> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (options.allowCachedProfile) {
          const cached = await authCache.readCachedProfile(userId);
          if (cached) {
            console.warn('[AuthService] Profile fetch failed; using cached profile');
            return { ok: true, data: cached };
          }
        }

        const classification = classifyAuthFailure(error);
        return {
          ok: false,
          code: classification.code as AuthIssueCode,
          message: `Profile fetch failed: ${error.message}`,
        };
      }

      const profile = data as UserProfile;

      // Cache the freshly fetched profile (best-effort, fire-and-forget)
      void authCache.cacheProfile(userId, profile);

      return { ok: true, data: profile };
    } catch (error) {
      if (options.allowCachedProfile) {
        const cached = await authCache.readCachedProfile(userId);
        if (cached) {
          console.warn('[AuthService] Profile fetch threw; using cached profile');
          return { ok: true, data: cached };
        }
      }

      const classification = classifyAuthFailure(error);
      return {
        ok: false,
        code: classification.code as AuthIssueCode,
        message: classification.message,
      };
    }
  },

  /**
   * Refresh the cached profile and return the updated record.
   * Allows cached fallback — use for background refresh, not auth validation.
   */
  async refreshProfile(userId: string): Promise<LoadProfileResult> {
    return this.loadProfile(userId, { allowCachedProfile: true });
  },

  /**
   * Clear the persisted Supabase session from device storage.
   * Call after hard demotion when the token is definitively invalid.
   */
  async clearPersistedSession(): Promise<void> {
    try {
      // Signing out locally removes the persisted session from AsyncStorage
      // without making a network request to Supabase's revoke endpoint.
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('[AuthService] clearPersistedSession failed (non-fatal):', error);
    }
  },

  /**
   * Clear the cached profile for a user.
   */
  async clearCachedProfile(userId: string): Promise<void> {
    await authCache.clearCachedProfile(userId);
  },

  /**
   * Cache a profile — exposed for use by AuthProvider after profile updates.
   */
  async cacheProfile(userId: string, profile: UserProfile): Promise<void> {
    await authCache.cacheProfile(userId, profile);
  },

  /**
   * Read the cached profile without a network call.
   */
  async readCachedProfile(userId: string): Promise<UserProfile | null> {
    return authCache.readCachedProfile(userId);
  },

  /**
   * Classify an arbitrary error into an AuthFailureClassification.
   * Exposed so AuthProvider can classify errors from onAuthStateChange.
   */
  classifyAuthFailure,
};
