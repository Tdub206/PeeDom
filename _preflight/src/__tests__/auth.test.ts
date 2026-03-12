import { describe, expect, it, beforeEach } from '@jest/globals';

import { useAuthStore } from '@/store/useAuthStore';
import { ReturnIntent, UserProfile } from '@/types';

const authenticatedProfile: UserProfile = {
  id: 'user-123',
  email: 'test@test.com',
  display_name: 'Test User',
  role: 'user',
  points_balance: 0,
  is_premium: false,
  is_suspended: false,
  created_at: '2026-03-12T00:00:00.000Z',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      sessionStatus: 'BOOTSTRAPPING',
      loading: true,
      authIssue: null,
      returnIntent: null,
    });
  });

  it('moves into an authenticated state with derived status', () => {
    useAuthStore.getState().setAuthenticated({
      session: { user: { id: 'user-123', email: 'test@test.com' } } as never,
      user: { id: 'user-123', email: 'test@test.com' } as never,
      profile: authenticatedProfile,
      role: 'user',
    });

    const state = useAuthStore.getState();

    expect(state.user?.id).toBe('user-123');
    expect(state.profile?.display_name).toBe('Test User');
    expect(state.sessionStatus).toBe('AUTHENTICATED_USER');
    expect(state.loading).toBe(false);
  });

  it('clears session state when demoted to guest', () => {
    useAuthStore.getState().setAuthenticated({
      session: { user: { id: 'user-123', email: 'test@test.com' } } as never,
      user: { id: 'user-123', email: 'test@test.com' } as never,
      profile: authenticatedProfile,
      role: 'user',
    });

    useAuthStore.getState().setGuest();

    const state = useAuthStore.getState();

    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.sessionStatus).toBe('GUEST');
    expect(state.loading).toBe(false);
  });

  it('stores and consumes return intents', () => {
    const intent: ReturnIntent = {
      intent_id: 'intent-1',
      type: 'favorite_toggle',
      route: '/(tabs)',
      params: { bathroom_id: 'bathroom-1' },
      created_at: '2026-03-12T00:00:00.000Z',
      replay_strategy: 'immediate_after_auth',
    };

    useAuthStore.getState().setReturnIntent(intent);

    expect(useAuthStore.getState().returnIntent).toEqual(intent);
    expect(useAuthStore.getState().consumeReturnIntent()).toEqual(intent);
    expect(useAuthStore.getState().returnIntent).toBeNull();
  });

  it('re-derives role status when the profile changes', () => {
    useAuthStore.getState().setAuthenticated({
      session: { user: { id: 'user-123', email: 'test@test.com' } } as never,
      user: { id: 'user-123', email: 'test@test.com' } as never,
      profile: authenticatedProfile,
      role: 'user',
    });

    useAuthStore.getState().updateProfile({
      ...authenticatedProfile,
      role: 'admin',
    });

    expect(useAuthStore.getState().sessionStatus).toBe('AUTHENTICATED_ADMIN');
  });
});
