/**
 * AuthProvider — Session Lifecycle & Imperative Auth Actions
 *
 * Responsibilities:
 *   • Bootstrap supabase.auth.getSession() on mount
 *   • Subscribe exactly once to supabase.auth.onAuthStateChange
 *   • Translate AuthService results → useAuthStore actions
 *   • Expose imperative actions: signIn, signUp, signOut,
 *     refreshProfile, refreshUser, requireAuth,
 *     peekReturnIntent, consumeReturnIntent, clearReturnIntent
 *
 * Does NOT own state — state lives in useAuthStore (Zustand).
 * Does NOT import react-query directly — that is useProfile's concern.
 *
 * refreshUser() exact logic (spec §2):
 *   1. set loading=true, sessionStatus=SESSION_RECOVERY
 *   2. capture effectiveUserId from store snapshot before network call
 *   3. call AuthService.getSession()
 *   4+5. on error or null → demote to GUEST (do NOT clear offline queue)
 *   6. call loadProfile(userId, { allowCachedProfile: false })
 *   7. on profile failure → demote to GUEST (no cached fallback)
 *   8. on success → atomically set session+user+profile+status, clear issue
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AuthChangeEvent, AuthError, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore, AuthIssue } from '@/store/useAuthStore';
import { AuthService } from '@/services/auth/AuthService';
import { offlineQueue } from '@/lib/offline/offline-queue';
import { RequireAuthIntent, ReturnIntent, ReplayStrategy } from '@/types';

// ── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: AuthError | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /**
   * Synchronous guest gate.
   * Returns the current user when authenticated.
   * Returns null when guest; intent is persisted in store and caller must navigate to login.
   */
  requireAuth: (intent?: RequireAuthIntent) => User | null;
  /** Read the pending return intent without consuming it. */
  peekReturnIntent: () => ReturnIntent | null;
  /** Consume (read + clear) the pending return intent. Returns it or null. */
  consumeReturnIntent: () => ReturnIntent | null;
  /** Clear the pending return intent without reading it. */
  clearReturnIntent: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore;
  const bootstrapped = useRef(false);

  // ── Demotion helper ────────────────────────────────────────────────────────

  /**
   * Demote to guest state.
   *
   * IMPORTANT: This does NOT clear the offline queue. The scoped queue is only
   * cleared on explicit sign-out. Session expiry and refreshUser failures
   * preserve the queue so mutations can replay after re-authentication.
   */
  const demoteToGuest = useCallback(
    (issue?: Omit<AuthIssue, 'timestamp'>) => {
      store.getState().setGuest();
      store.getState().clearReturnIntent();
      if (issue) {
        store.getState().setAuthIssue({
          ...issue,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [store]
  );

  // ── Session bootstrap ──────────────────────────────────────────────────────

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let mounted = true;

    const bootstrap = async () => {
      store.getState().setBootstrapping();

      const result = await AuthService.getSession();

      if (!mounted) return;

      if (!result.ok) {
        demoteToGuest({ code: result.code, message: result.message });
        return;
      }

      if (!result.data) {
        // No active session — clean guest state
        store.getState().setGuest();
        return;
      }

      const { session, user } = result.data;

      // Allow cached profile during bootstrap for faster UI rendering
      const profileResult = await AuthService.loadProfile(user.id, {
        allowCachedProfile: true,
      });

      if (!mounted) return;

      if (!profileResult.ok) {
        demoteToGuest({ code: profileResult.code, message: profileResult.message });
        return;
      }

      store.getState().setAuthenticated({
        session,
        user,
        profile: profileResult.data,
        role: profileResult.data.role,
      });

      // Hydrate the offline queue for this user
      await offlineQueue.initialize(user.id);
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [demoteToGuest, store]);

  // ── Supabase auth state listener ───────────────────────────────────────────

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const state = store.getState();
        console.log('[AuthProvider] auth event:', event);

        switch (event) {
          case 'SIGNED_OUT': {
            const userId = state.user?.id;
            if (userId) {
              // Explicit sign-out: clear the signed-out user's scoped queue AND cache
              await offlineQueue.clearForUser(userId);
              await AuthService.clearCachedProfile(userId);
            }
            state.setGuest();
            state.clearReturnIntent();
            break;
          }

          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED': {
            if (!session) {
              demoteToGuest({ code: 'session_fetch_failed', message: 'No session in event payload.' });
              return;
            }
            state.setSessionRecovery();
            const profileResult = await AuthService.loadProfile(session.user.id, {
              allowCachedProfile: true,
            });
            if (!profileResult.ok) {
              demoteToGuest({ code: profileResult.code, message: profileResult.message });
              return;
            }
            state.setAuthenticated({
              session,
              user: session.user,
              profile: profileResult.data,
              role: profileResult.data.role,
            });
            await offlineQueue.initialize(session.user.id);
            break;
          }

          case 'USER_UPDATED': {
            if (session) {
              const profileResult = await AuthService.loadProfile(session.user.id, {
                allowCachedProfile: true,
              });

              if (!profileResult.ok) {
                demoteToGuest({ code: profileResult.code, message: profileResult.message });
                return;
              }

              state.setAuthenticated({
                session,
                user: session.user,
                profile: profileResult.data,
                role: profileResult.data.role,
              });
            }
            break;
          }

          default:
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [demoteToGuest, store]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      const result = await AuthService.signInWithEmail(email, password);
      if (!result.ok) {
        return { error: new AuthError(result.message) };
      }
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string
    ): Promise<{ error: AuthError | null; needsEmailConfirmation?: boolean }> => {
      const result = await AuthService.signUpWithEmail(email, password, displayName);
      if (!result.ok) {
        return { error: new AuthError(result.message) };
      }
      return { error: null, needsEmailConfirmation: result.data.needsEmailConfirmation };
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    await AuthService.signOut();
    // onAuthStateChange SIGNED_OUT handler drives store update
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    const { user } = store.getState();
    if (!user) return;

    const result = await AuthService.refreshProfile(user.id);
    if (result.ok) {
      store.getState().updateProfile(result.data);
    }
  }, [store]);

  /**
   * refreshUser — re-validates session from network.
   * Spec §2 exact implementation:
   *   - Does NOT allow cached profile
   *   - Demotes to GUEST on any failure
   *   - Does NOT delete offline queue on demotion
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    const state = store.getState();

    // Step 1: set loading + SESSION_RECOVERY
    state.setLoading(true);
    state.setSessionRecovery();

    // Step 2: capture effectiveUserId BEFORE any network call
    const effectiveUserId = state.user?.id ?? null;

    // Step 3: call getSession
    const sessionResult = await AuthService.getSession();

    // Step 4: error path → demote (preserve queue)
    if (!sessionResult.ok) {
      demoteToGuest({ code: sessionResult.code, message: sessionResult.message });

      const classification = AuthService.classifyAuthFailure(
        new Error(sessionResult.message)
      );
      if (classification.isAuthError) {
        // Token is definitively invalid — clear the persisted session
        await AuthService.clearPersistedSession();
      }
      return;
    }

    // Step 5: null session → demote (preserve queue)
    if (!sessionResult.data) {
      demoteToGuest({ code: 'session_fetch_failed', message: 'No active session found.' });
      return;
    }

    const { session, user } = sessionResult.data;

    // Guard: if the user changed mid-flight, abort — the listener will handle it
    if (effectiveUserId && effectiveUserId !== user.id) {
      console.warn('[AuthProvider] refreshUser: user changed mid-flight — aborting');
      return;
    }

    // Step 6: load profile — NO cached fallback allowed
    const profileResult = await AuthService.loadProfile(user.id, {
      allowCachedProfile: false,
    });

    // Step 7: profile failure → demote (preserve queue)
    if (!profileResult.ok) {
      demoteToGuest({ code: profileResult.code, message: profileResult.message });
      return;
    }

    // Step 8: atomically update store
    state.setAuthenticated({
      session,
      user,
      profile: profileResult.data,
      role: profileResult.data.role,
    });
    state.clearAuthIssue();
  }, [store, demoteToGuest]);

  const requireAuth = useCallback(
    (intent?: RequireAuthIntent): User | null => {
      const { sessionStatus, user } = store.getState();
      const isAuthenticated =
        sessionStatus === 'AUTHENTICATED_USER' ||
        sessionStatus === 'AUTHENTICATED_ADMIN' ||
        sessionStatus === 'AUTHENTICATED_BUSINESS';

      if (isAuthenticated && user) {
        return user;
      }

      if (intent) {
        const returnIntent: ReturnIntent = {
          intent_id: `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: intent.type,
          route: intent.route,
          params: intent.params,
          created_at: new Date().toISOString(),
          replay_strategy: (intent.replay_strategy as ReplayStrategy) ?? 'immediate_after_auth',
        };
        store.getState().setReturnIntent(returnIntent);
      }

      return null;
    },
    [store]
  );

  const peekReturnIntent = useCallback(
    (): ReturnIntent | null => store.getState().returnIntent,
    [store]
  );

  const consumeReturnIntent = useCallback(
    (): ReturnIntent | null => store.getState().consumeReturnIntent(),
    [store]
  );

  const clearReturnIntent = useCallback(
    (): void => store.getState().clearReturnIntent(),
    [store]
  );

  // ── Context value ──────────────────────────────────────────────────────────

  const value: AuthContextValue = {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
