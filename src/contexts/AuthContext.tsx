import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { clearPushToken } from '@/api/notifications';
import { useToastContext } from '@/contexts/ToastContext';
import { clearAnalyticsIdentity, identifyAnalyticsUser } from '@/lib/analytics';
import { hasActivePremium } from '@/lib/gamification';
import { storage } from '@/lib/storage';
import { dbProfileSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import { classifySupabaseError, SupabaseErrorDetails } from '@/lib/supabase-error';
import { setSentryUserContext } from '@/lib/sentry';
import { useAuthStore } from '@/store/useAuthStore';
import { DEFAULT_NOTIFICATION_PREFS, RequireAuthOptions, ReturnIntent, SessionState, SessionStatus, UserProfile } from '@/types';

interface AuthContextType {
  sessionState: SessionState;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authIssue: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUser: () => Promise<void>;
  requireAuth: (options?: RequireAuthOptions) => User | null;
  peekReturnIntent: () => ReturnIntent | null;
  consumeReturnIntent: () => ReturnIntent | null;
  clearReturnIntent: () => void;
  isGuest: boolean;
  isAuthenticated: boolean;
  canAccessProtectedRoute: boolean;
}

interface ProfileLoadResult {
  profile: UserProfile | null;
  errorDetails: SupabaseErrorDetails | null;
  usedCache: boolean;
}

interface ApplyAuthenticatedSessionOptions {
  demoteToGuestOnFailure?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCachedProfileKey(userId: string): string {
  return `${storage.keys.CACHED_PROFILE}:${userId}`;
}

async function readCachedProfile(userId: string): Promise<UserProfile | null> {
  const cachedProfile = await storage.get<Partial<UserProfile> | null>(getCachedProfileKey(userId));

  if (!cachedProfile || cachedProfile.id !== userId || typeof cachedProfile.created_at !== 'string') {
    return null;
  }

  return {
    id: cachedProfile.id,
    email: typeof cachedProfile.email === 'string' || cachedProfile.email === null ? cachedProfile.email : null,
    display_name:
      typeof cachedProfile.display_name === 'string' || cachedProfile.display_name === null
        ? cachedProfile.display_name
        : null,
    role:
      cachedProfile.role === 'admin' || cachedProfile.role === 'business' || cachedProfile.role === 'user'
        ? cachedProfile.role
        : 'user',
    points_balance: typeof cachedProfile.points_balance === 'number' ? cachedProfile.points_balance : 0,
    is_premium: Boolean(cachedProfile.is_premium),
    premium_expires_at: typeof cachedProfile.premium_expires_at === 'string' ? cachedProfile.premium_expires_at : null,
    is_suspended: Boolean(cachedProfile.is_suspended),
    current_streak: typeof cachedProfile.current_streak === 'number' ? cachedProfile.current_streak : 0,
    longest_streak: typeof cachedProfile.longest_streak === 'number' ? cachedProfile.longest_streak : 0,
    last_contribution_date:
      typeof cachedProfile.last_contribution_date === 'string' ? cachedProfile.last_contribution_date : null,
    streak_multiplier: typeof cachedProfile.streak_multiplier === 'number' ? cachedProfile.streak_multiplier : 1,
    streak_multiplier_expires_at:
      typeof cachedProfile.streak_multiplier_expires_at === 'string'
        ? cachedProfile.streak_multiplier_expires_at
        : null,
    push_token: typeof cachedProfile.push_token === 'string' ? cachedProfile.push_token : null,
    push_enabled: typeof cachedProfile.push_enabled === 'boolean' ? cachedProfile.push_enabled : true,
    notification_prefs:
      cachedProfile.notification_prefs &&
      typeof cachedProfile.notification_prefs === 'object' &&
      !Array.isArray(cachedProfile.notification_prefs)
        ? {
            code_verified:
              typeof cachedProfile.notification_prefs.code_verified === 'boolean'
                ? cachedProfile.notification_prefs.code_verified
                : DEFAULT_NOTIFICATION_PREFS.code_verified,
            favorite_update:
              typeof cachedProfile.notification_prefs.favorite_update === 'boolean'
                ? cachedProfile.notification_prefs.favorite_update
                : DEFAULT_NOTIFICATION_PREFS.favorite_update,
            nearby_new:
              typeof cachedProfile.notification_prefs.nearby_new === 'boolean'
                ? cachedProfile.notification_prefs.nearby_new
                : DEFAULT_NOTIFICATION_PREFS.nearby_new,
            streak_reminder:
              typeof cachedProfile.notification_prefs.streak_reminder === 'boolean'
                ? cachedProfile.notification_prefs.streak_reminder
                : DEFAULT_NOTIFICATION_PREFS.streak_reminder,
            arrival_alert:
              typeof cachedProfile.notification_prefs.arrival_alert === 'boolean'
                ? cachedProfile.notification_prefs.arrival_alert
                : DEFAULT_NOTIFICATION_PREFS.arrival_alert,
          }
        : DEFAULT_NOTIFICATION_PREFS,
    created_at: cachedProfile.created_at,
    updated_at: typeof cachedProfile.updated_at === 'string' ? cachedProfile.updated_at : cachedProfile.created_at,
  };
}

async function cacheProfile(profile: UserProfile): Promise<void> {
  await storage.set(getCachedProfileKey(profile.id), profile);
}

async function clearCachedProfile(userId: string | null | undefined): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    await storage.remove(getCachedProfileKey(userId));
  } catch (error) {
    console.error('Unable to clear the cached profile:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext();
  const authIssue = useAuthStore((state) => state.authIssue);
  const loading = useAuthStore((state) => state.loading);
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const user = useAuthStore((state) => state.user);
  const clearStoredAuthState = useAuthStore((state) => state.clearAuthState);
  const setAuthIssue = useAuthStore((state) => state.setAuthIssue);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setSnapshot = useAuthStore((state) => state.setSnapshot);
  const lastReportedIssue = useRef<string | null>(null);
  const returnIntentRef = useRef<ReturnIntent | null>(null);

  const buildReturnIntent = useCallback((options: RequireAuthOptions): ReturnIntent => {
    return {
      intent_id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: options.type,
      route: options.route,
      params: options.params,
      created_at: new Date().toISOString(),
      replay_strategy: options.replay_strategy ?? 'immediate_after_auth',
    };
  }, []);

  const clearReturnIntent = useCallback(() => {
    returnIntentRef.current = null;
  }, []);

  const peekReturnIntent = useCallback(() => {
    return returnIntentRef.current;
  }, []);

  const consumeReturnIntent = useCallback(() => {
    const currentIntent = returnIntentRef.current;
    returnIntentRef.current = null;
    return currentIntent;
  }, []);

  const reportAuthIssue = useCallback(
    (details: SupabaseErrorDetails) => {
      setAuthIssue(details.message);

      if (lastReportedIssue.current === details.message) {
        return;
      }

      lastReportedIssue.current = details.message;
      showToast({
        title: details.title,
        message: details.message,
        variant: details.kind === 'offline' ? 'warning' : 'error',
      });
    },
    [setAuthIssue, showToast]
  );

  const clearReportedIssue = useCallback(() => {
    lastReportedIssue.current = null;
    setAuthIssue(null);
  }, [setAuthIssue]);

  const clearAuthState = useCallback((nextStatus: SessionStatus = 'GUEST') => {
    clearStoredAuthState(nextStatus);
  }, [clearStoredAuthState]);

  const clearSessionArtifacts = useCallback(
    async (userId?: string) => {
      clearReturnIntent();

      try {
        await storage.remove(storage.keys.OFFLINE_QUEUE);
      } catch (error) {
        console.error('Unable to clear the offline queue:', error);
      }

      try {
        await storage.remove(storage.keys.RETURN_INTENT);
      } catch (error) {
        console.error('Unable to clear the legacy persisted return intent:', error);
      }

      await clearCachedProfile(userId);
    },
    [clearReturnIntent]
  );

  const clearPersistedSession = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch (error) {
      console.error('Unable to clear the persisted auth session:', error);
    }
  }, []);

  const determineSessionStatus = useCallback(
    (currentSession: Session | null, currentProfile: UserProfile | null): SessionStatus => {
      if (!currentSession) {
        return 'GUEST';
      }

      if (!currentProfile) {
        return 'AUTHENTICATED_USER';
      }

      switch (currentProfile.role) {
        case 'admin':
          return 'AUTHENTICATED_ADMIN';
        case 'business':
          return 'AUTHENTICATED_BUSINESS';
        case 'user':
        default:
          return 'AUTHENTICATED_USER';
      }
    },
    []
  );

  const loadProfile = useCallback(async (userId: string): Promise<ProfileLoadResult> => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const parsedProfile = parseSupabaseNullableRow(
        dbProfileSchema,
        data,
        'profile',
        'We could not restore your Pee-Dom profile.'
      );

      if (parsedProfile.error) {
        throw parsedProfile.error;
      }

      if (!parsedProfile.data) {
        return {
          profile: null,
          errorDetails: classifySupabaseError(
            new Error('We could not find a profile for this authenticated user.'),
            'We could not restore your Pee-Dom profile.'
          ),
          usedCache: false,
        };
      }

      const normalizedProfile: UserProfile = {
        ...parsedProfile.data,
        notification_prefs: {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...parsedProfile.data.notification_prefs,
        },
      };

      await cacheProfile(normalizedProfile);

      return {
        profile: normalizedProfile,
        errorDetails: null,
        usedCache: false,
      };
    } catch (error) {
      const errorDetails = classifySupabaseError(error, 'We could not restore your Pee-Dom profile.');

      if (errorDetails.kind === 'offline') {
        const cachedProfile = await readCachedProfile(userId);

        if (cachedProfile) {
          return {
            profile: cachedProfile,
            errorDetails,
            usedCache: true,
          };
        }
      }

      return {
        profile: null,
        errorDetails,
        usedCache: false,
      };
    }
  }, []);

  const applyAuthenticatedSession = useCallback(
    async (
      currentSession: Session,
      options?: ApplyAuthenticatedSessionOptions
    ): Promise<boolean> => {
      setSnapshot({
        loading: true,
        session: currentSession,
        sessionStatus: 'SESSION_RECOVERY',
        user: currentSession.user,
      });

      const result = await loadProfile(currentSession.user.id);

      if (result.profile) {
        setSnapshot({
          loading: false,
          profile: result.profile,
          sessionStatus: determineSessionStatus(currentSession, result.profile),
        });

        if (result.usedCache && result.errorDetails) {
          reportAuthIssue(result.errorDetails);
        } else {
          clearReportedIssue();
        }

        return true;
      }

      if (result.errorDetails) {
        reportAuthIssue(result.errorDetails);
      }

      if (options?.demoteToGuestOnFailure) {
        await clearSessionArtifacts(currentSession.user.id);

        if (result.errorDetails?.shouldClearSession) {
          await clearPersistedSession();
        }

        clearAuthState('GUEST');
        return false;
      }

      if (result.errorDetails?.kind === 'offline') {
        setSnapshot({
          loading: false,
          profile: null,
          sessionStatus: determineSessionStatus(currentSession, null),
        });
        return false;
      }

      if (result.errorDetails?.shouldClearSession) {
        await clearSessionArtifacts(currentSession.user.id);
        await clearPersistedSession();
        clearAuthState('GUEST');
        return false;
      }

      clearAuthState('SESSION_INVALID');
      return false;
    },
    [
      clearAuthState,
      clearPersistedSession,
      clearReportedIssue,
      clearSessionArtifacts,
      determineSessionStatus,
      loadProfile,
      reportAuthIssue,
      setSnapshot,
    ]
  );

  useEffect(() => {
    if (!user) {
      setSentryUserContext(null);
      void clearAnalyticsIdentity();
      return;
    }

    setSentryUserContext({
      id: user.id,
      isPremium: hasActivePremium(profile),
      role: profile?.role ?? null,
    });
    void identifyAnalyticsUser(user.id);
  }, [profile?.is_premium, profile?.premium_expires_at, profile?.role, user]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        setSnapshot({
          loading: true,
          sessionStatus: 'BOOTSTRAPPING',
        });

        const {
          data: { session: currentSession },
          error,
        } = await getSupabaseClient().auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          reportAuthIssue(classifySupabaseError(error, 'We could not restore your session.'));
          clearAuthState('GUEST');
          return;
        }

        if (!currentSession) {
          clearReportedIssue();
          clearAuthState('GUEST');
          return;
        }

        await applyAuthenticatedSession(currentSession);
      } catch (error) {
        if (!mounted) {
          return;
        }

        reportAuthIssue(classifySupabaseError(error, 'We could not initialize authentication.'));
        clearAuthState('GUEST');
      }
    };

    void initializeSession();

    return () => {
      mounted = false;
    };
  }, [applyAuthenticatedSession, clearAuthState, clearReportedIssue, reportAuthIssue, setSnapshot]);

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((event, currentSession) => {
      void (async () => {
        console.log('Auth state change:', event);

        try {
          if (event === 'SIGNED_OUT') {
            await clearSessionArtifacts(currentSession?.user.id ?? user?.id);
            clearReportedIssue();
            clearAuthState('GUEST');
            return;
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (!currentSession) {
              await clearSessionArtifacts(user?.id);
              clearAuthState('GUEST');
              return;
            }

            await applyAuthenticatedSession(currentSession);
          }
        } catch (error) {
          reportAuthIssue(classifySupabaseError(error, 'The authentication state could not be updated.'));
          clearAuthState('SESSION_INVALID');
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [applyAuthenticatedSession, clearAuthState, clearReportedIssue, clearSessionArtifacts, reportAuthIssue, user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const currentUserId = user?.id;
      clearReturnIntent();
      if (currentUserId) {
        await clearPushToken();
      }
      await getSupabaseClient().auth.signOut();
      await clearSessionArtifacts(currentUserId);
      clearReportedIssue();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [clearReportedIssue, clearReturnIntent, clearSessionArtifacts, user?.id]);

  const refreshProfile = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      const result = await loadProfile(user.id);

      if (result.profile) {
        setProfile(result.profile);

        if (result.usedCache && result.errorDetails) {
          reportAuthIssue(result.errorDetails);
        } else {
          clearReportedIssue();
        }

        return;
      }

      if (result.errorDetails) {
        reportAuthIssue(result.errorDetails);
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  }, [clearReportedIssue, loadProfile, reportAuthIssue, setProfile, user]);

  const refreshUser = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
        error,
      } = await getSupabaseClient().auth.getSession();

      if (error) {
        reportAuthIssue(classifySupabaseError(error, 'We could not refresh your session.'));
        await clearSessionArtifacts(user?.id ?? session?.user.id);
        await clearPersistedSession();
        clearAuthState('GUEST');
        return;
      }

      if (!currentSession) {
        await clearSessionArtifacts(user?.id ?? session?.user.id);
        await clearPersistedSession();
        clearAuthState('GUEST');
        return;
      }

      await applyAuthenticatedSession(currentSession, {
        demoteToGuestOnFailure: true,
      });
    } catch (error) {
      reportAuthIssue(classifySupabaseError(error, 'We could not refresh your session.'));
      await clearSessionArtifacts(user?.id ?? session?.user.id);
      await clearPersistedSession();
      clearAuthState('GUEST');
    }
  }, [
    applyAuthenticatedSession,
    clearAuthState,
    clearPersistedSession,
    clearSessionArtifacts,
    reportAuthIssue,
    session?.user.id,
    setLoading,
    user?.id,
  ]);

  const isGuest = sessionStatus === 'GUEST';
  const isAuthenticated = sessionStatus.startsWith('AUTHENTICATED_');
  const canAccessProtectedRoute = isAuthenticated && sessionStatus !== 'SESSION_INVALID';

  const requireAuth = useCallback(
    (options?: RequireAuthOptions): User | null => {
      if (!user || !canAccessProtectedRoute) {
        if (options) {
          returnIntentRef.current = buildReturnIntent(options);
        }

        return null;
      }

      return user;
    },
    [buildReturnIntent, canAccessProtectedRoute, user]
  );

  const sessionState: SessionState = useMemo(
    () => ({
      status: sessionStatus,
      session: session
        ? {
            user_id: session.user.id,
            email: session.user.email || '',
          }
        : null,
      profile: profile
        ? {
            role: profile.role,
            display_name: profile.display_name,
            points_balance: profile.points_balance,
            is_premium: hasActivePremium(profile),
            premium_expires_at: profile.premium_expires_at,
          }
        : null,
    }),
    [profile, session, sessionStatus]
  );

  const value: AuthContextType = {
    sessionState,
    session,
    user,
    profile,
    authIssue,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshUser,
    requireAuth,
    peekReturnIntent,
    consumeReturnIntent,
    clearReturnIntent,
    isGuest,
    isAuthenticated,
    canAccessProtectedRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
