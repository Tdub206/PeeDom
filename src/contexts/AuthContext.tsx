import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SessionStatus, SessionState, UserProfile, UserRole } from '@/types';
import { storage } from '@/lib/storage';

interface AuthContextType {
  sessionState: SessionState;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isGuest: boolean;
  isAuthenticated: boolean;
  canAccessProtectedRoute: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('BOOTSTRAPPING');
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  // Determine session status based on session and profile
  const determineSessionStatus = useCallback((
    currentSession: Session | null,
    currentProfile: UserProfile | null
  ): SessionStatus => {
    if (!currentSession || !currentProfile) {
      return 'GUEST';
    }

    const role = currentProfile.role as UserRole;

    switch (role) {
      case 'admin':
        return 'AUTHENTICATED_ADMIN';
      case 'business':
        return 'AUTHENTICATED_BUSINESS';
      case 'user':
      default:
        return 'AUTHENTICATED_USER';
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        setSessionStatus('BOOTSTRAPPING');
        
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setSessionStatus('GUEST');
            setLoading(false);
          }
          return;
        }

        if (!currentSession) {
          // No session - user is guest
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setSessionStatus('GUEST');
            setLoading(false);
          }
          return;
        }

        // Session exists - fetch profile
        if (mounted) {
          setSessionStatus('SESSION_RECOVERY');
          setSession(currentSession);
          setUser(currentSession.user);
        }

        const userProfile = await fetchProfile(currentSession.user.id);

        if (!userProfile) {
          // Profile fetch failed - treat as invalid session
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setSessionStatus('SESSION_INVALID');
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setProfile(userProfile);
          setSessionStatus(determineSessionStatus(currentSession, userProfile));
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSessionStatus('GUEST');
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [fetchProfile, determineSessionStatus]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state change:', event);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setSessionStatus('GUEST');
        setLoading(false);
        // Clear auth-dependent cache
        await storage.remove(storage.keys.OFFLINE_QUEUE);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentSession) {
          setSessionStatus('SESSION_RECOVERY');
          setSession(currentSession);
          setUser(currentSession.user);

          const userProfile = await fetchProfile(currentSession.user.id);
          
          if (userProfile) {
            setProfile(userProfile);
            setSessionStatus(determineSessionStatus(currentSession, userProfile));
          } else {
            setSessionStatus('SESSION_INVALID');
          }
          
          setLoading(false);
        }
        return;
      }

      if (event === 'USER_UPDATED') {
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Refresh profile on user update
          const userProfile = await fetchProfile(currentSession.user.id);
          if (userProfile) {
            setProfile(userProfile);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, determineSessionStatus]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
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

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Clear all auth-dependent local data
      await storage.remove(storage.keys.OFFLINE_QUEUE);
      await storage.remove(storage.keys.RETURN_INTENT);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    const userProfile = await fetchProfile(user.id);
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  // Derived state
  const isGuest = sessionStatus === 'GUEST';
  const isAuthenticated = sessionStatus.startsWith('AUTHENTICATED_');
  const canAccessProtectedRoute = isAuthenticated && sessionStatus !== 'SESSION_INVALID';

  const sessionState: SessionState = {
    status: sessionStatus,
    session: session ? {
      user_id: session.user.id,
      email: session.user.email || '',
    } : null,
    profile: profile ? {
      role: profile.role,
      display_name: profile.display_name,
      points_balance: profile.points_balance,
      is_premium: profile.is_premium,
    } : null,
  };

  const value: AuthContextType = {
    sessionState,
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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
