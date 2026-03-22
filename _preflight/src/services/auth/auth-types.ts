/**
 * auth-types.ts
 *
 * Typed result shapes returned by AuthService methods.
 * These are service-layer types — not UI state, not Zustand state.
 * AuthProvider maps these into store actions.
 */

import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '@/types';
import { AuthIssueCode } from '@/store/useAuthStore';

// ── Generic result wrapper ────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AuthIssueCode; message: string };

// ── Session ───────────────────────────────────────────────────────────────────

export interface SessionPayload {
  session: Session;
  user: User;
}

export type GetSessionResult = ServiceResult<SessionPayload | null>;

// ── Sign in / sign up ─────────────────────────────────────────────────────────

export type SignInResult = ServiceResult<SessionPayload>;
export type SignUpResult = ServiceResult<{ needsEmailConfirmation: boolean }>;

// ── Profile ───────────────────────────────────────────────────────────────────

export type LoadProfileResult = ServiceResult<UserProfile>;

// ── Sign out ──────────────────────────────────────────────────────────────────

export type SignOutResult = ServiceResult<void>;

// ── Auth failure classification ───────────────────────────────────────────────

export interface AuthFailureClassification {
  code: AuthIssueCode;
  message: string;
  /** True when the failure is a transient network issue (safe to retain intent/queue) */
  isTransient: boolean;
  /** True when the Supabase token is definitively invalid/expired */
  isAuthError: boolean;
}
