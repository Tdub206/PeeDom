/**
 * useAuth — Compatibility Facade
 *
 * Merges Zustand store state + AuthProvider imperative actions into a single
 * object that matches the shape existing screens expect. New screens should
 * prefer the granular selectors from useAuthStore for better performance.
 *
 * Usage (existing pattern still works):
 *   const { user, isAuthenticated, signIn, signOut, requireAuth } = useAuth();
 *
 * Better pattern for new screens:
 *   const user = useAuthUser();            // only re-renders when user changes
 *   const isGuest = useIsGuest();          // only re-renders on guest toggle
 *   const { signIn } = useAuthContext();   // imperative actions
 */

import { useAuthStore } from '@/store/useAuthStore';
import { useAuthContext } from '@/contexts/AuthProvider';

export function useAuth() {
  // ── State from Zustand ─────────────────────────────────────────────────────
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const loading = useAuthStore((s) => s.loading);
  const authIssue = useAuthStore((s) => s.authIssue);

  const isGuest = sessionStatus === 'GUEST';
  const isAuthenticated =
    sessionStatus === 'AUTHENTICATED_USER' ||
    sessionStatus === 'AUTHENTICATED_ADMIN' ||
    sessionStatus === 'AUTHENTICATED_BUSINESS';
  const canAccessProtectedRoute =
    isAuthenticated && sessionStatus !== 'SESSION_INVALID';

  // ── Actions from context ───────────────────────────────────────────────────
  const {
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshUser,
    requireAuth,
    peekReturnIntent,
    consumeReturnIntent,
    clearReturnIntent,
  } = useAuthContext();

  return {
    // State
    session,
    user,
    profile,
    sessionStatus,
    loading,
    authIssue,
    isGuest,
    isAuthenticated,
    canAccessProtectedRoute,
    // Actions
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshUser,
    requireAuth,
    peekReturnIntent,
    consumeReturnIntent,
    clearReturnIntent,
  };
}
