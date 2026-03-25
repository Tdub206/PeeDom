import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { SessionStatus, UserProfile } from '@/types';

interface AuthSnapshotUpdate {
  authIssue?: string | null;
  loading?: boolean;
  profile?: UserProfile | null;
  session?: Session | null;
  sessionStatus?: SessionStatus;
  user?: User | null;
}

interface AuthStoreState {
  authIssue: string | null;
  loading: boolean;
  profile: UserProfile | null;
  session: Session | null;
  sessionStatus: SessionStatus;
  setAuthIssue: (authIssue: string | null) => void;
  setLoading: (loading: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSnapshot: (snapshot: AuthSnapshotUpdate) => void;
  user: User | null;
  clearAuthState: (nextStatus?: SessionStatus) => void;
}

const initialAuthStoreState = {
  authIssue: null,
  loading: true,
  profile: null,
  session: null,
  sessionStatus: 'BOOTSTRAPPING' as SessionStatus,
  user: null,
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...initialAuthStoreState,
  clearAuthState: (nextStatus = 'GUEST') =>
    set({
      ...initialAuthStoreState,
      loading: false,
      sessionStatus: nextStatus,
    }),
  setAuthIssue: (authIssue) => set({ authIssue }),
  setLoading: (loading) => set({ loading }),
  setProfile: (profile) => set({ profile }),
  setSnapshot: (snapshot) =>
    set((state) => ({
      ...state,
      ...snapshot,
    })),
}));
