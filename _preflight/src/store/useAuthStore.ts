/**
 * useAuthStore — Zustand Session State Machine
 *
 * Owns ALL auth-related client state. Zero Supabase imports.
 * AuthProvider translates Supabase events → store actions.
 * Screens consume via granular selectors — not the full auth object.
 *
 * Selector pattern prevents unnecessary re-renders: a screen subscribed
 * to useIsAuthenticated will not re-render when display_name changes.
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import {
  SessionStatus,
  UserProfile,
  UserRole,
  ReturnIntent,
} from '@/types';

// ── Auth issue classification ────────────────────────────────────────────────

export type AuthIssueCode =
  | 'session_fetch_failed'
  | 'profile_fetch_failed'
  | 'token_expired'
  | 'rls_violation'
  | 'network_error'
  | 'unknown';

export interface AuthIssue {
  code: AuthIssueCode;
  message: string;
  timestamp: string;
}

// ── Store shape ──────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  sessionStatus: SessionStatus;
  loading: boolean;
  authIssue: AuthIssue | null;
  returnIntent: ReturnIntent | null;
}

interface AuthActions {
  setBootstrapping: () => void;
  setGuest: () => void;
  setAuthenticated: (payload: {
    session: Session;
    user: User;
    profile: UserProfile;
    role: UserRole;
  }) => void;
  setSessionRecovery: () => void;
  setSessionInvalid: () => void;
  setAuthIssue: (issue: AuthIssue) => void;
  clearAuthIssue: () => void;
  setReturnIntent: (intent: ReturnIntent) => void;
  consumeReturnIntent: () => ReturnIntent | null;
  clearReturnIntent: () => void;
  setLoading: (loading: boolean) => void;
  /** Partial profile update — used by refreshProfile without full re-auth */
  updateProfile: (profile: UserProfile) => void;
}

type AuthStore = AuthState & AuthActions;

// ── Role → SessionStatus mapping ─────────────────────────────────────────────

function roleToStatus(role: UserRole): SessionStatus {
  switch (role) {
    case 'admin':
      return 'AUTHENTICATED_ADMIN';
    case 'business':
      return 'AUTHENTICATED_BUSINESS';
    case 'user':
    default:
      return 'AUTHENTICATED_USER';
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const GUEST_STATE: Pick<AuthState, 'session' | 'user' | 'profile' | 'sessionStatus' | 'loading'> = {
  session: null,
  user: null,
  profile: null,
  sessionStatus: 'GUEST',
  loading: false,
};

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  session: null,
  user: null,
  profile: null,
  sessionStatus: 'BOOTSTRAPPING',
  loading: true,
  authIssue: null,
  returnIntent: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  setBootstrapping: () =>
    set({ sessionStatus: 'BOOTSTRAPPING', loading: true }),

  setGuest: () =>
    set({ ...GUEST_STATE, authIssue: null }),

  setAuthenticated: ({ session, user, profile, role }) =>
    set({
      session,
      user,
      profile,
      sessionStatus: roleToStatus(role),
      loading: false,
      authIssue: null,
    }),

  setSessionRecovery: () =>
    set({ sessionStatus: 'SESSION_RECOVERY', loading: true }),

  setSessionInvalid: () =>
    set({ sessionStatus: 'SESSION_INVALID', loading: false }),

  setAuthIssue: (issue) =>
    set({ authIssue: issue }),

  clearAuthIssue: () =>
    set({ authIssue: null }),

  setReturnIntent: (intent) =>
    set({ returnIntent: intent }),

  consumeReturnIntent: () => {
    const { returnIntent: intent } = get();
    set({ returnIntent: null });
    return intent;
  },

  clearReturnIntent: () =>
    set({ returnIntent: null }),

  setLoading: (loading) =>
    set({ loading }),

  updateProfile: (profile) =>
    set((state) => ({
      profile,
      // Re-derive status in case role changed
      sessionStatus: state.session ? roleToStatus(profile.role) : state.sessionStatus,
    })),
}));

// ── Granular selectors ────────────────────────────────────────────────────────
// Use these in screens. Each selector returns a stable primitive/reference
// so components only re-render when their specific slice changes.

/** Raw Supabase User object. Null when guest. */
export const useAuthUser = () => useAuthStore((s) => s.user);

/** Fetched UserProfile. Null when guest or profile not yet loaded. */
export const useAuthProfile = () => useAuthStore((s) => s.profile);

/** Current SessionStatus string. Use for nuanced routing decisions. */
export const useAuthStatus = () => useAuthStore((s) => s.sessionStatus);

/** True while session bootstrap or refreshUser is running. */
export const useAuthLoading = () => useAuthStore((s) => s.loading);

/** True when no authenticated session exists. */
export const useIsGuest = () =>
  useAuthStore((s) => s.sessionStatus === 'GUEST');

/** True when fully authenticated (any role). */
export const useIsAuthenticated = () =>
  useAuthStore((s) =>
    s.sessionStatus === 'AUTHENTICATED_USER' ||
    s.sessionStatus === 'AUTHENTICATED_ADMIN' ||
    s.sessionStatus === 'AUTHENTICATED_BUSINESS'
  );

/** True when authenticated and not SESSION_INVALID. Safe to render protected screens. */
export const useCanAccessProtectedRoute = () =>
  useAuthStore((s) =>
    (s.sessionStatus === 'AUTHENTICATED_USER' ||
      s.sessionStatus === 'AUTHENTICATED_ADMIN' ||
      s.sessionStatus === 'AUTHENTICATED_BUSINESS') &&
    s.sessionStatus !== 'SESSION_INVALID'
  );

/** Current non-null auth issue if any — drives error banners. */
export const useAuthIssue = () => useAuthStore((s) => s.authIssue);

/** Pending return intent — checked by login screen after successful auth. */
export const usePendingReturnIntent = () => useAuthStore((s) => s.returnIntent);
