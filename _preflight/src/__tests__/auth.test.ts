/**
 * auth.test.ts — Required AuthProvider / refreshUser Tests
 *
 * Covers spec §2 required tests:
 *   ✓ refreshUser() demotes to GUEST on getSession error
 *   ✓ refreshUser() demotes to GUEST on null session
 *   ✓ refreshUser() demotes to GUEST on profile fetch failure
 *   ✓ refreshUser() does NOT clear the offline queue on demotion
 *   ✓ requireAuth() returns false for guests and sets return intent
 *   ✓ requireAuth() returns true for authenticated users
 */

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuthContext } from '../contexts/AuthProvider';
import { useAuthStore } from '../store/useAuthStore';
import { AuthService } from '../services/auth/AuthService';
import { offlineQueue } from '../lib/offline/offline-queue';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../services/auth/AuthService');
jest.mock('../lib/offline/offline-queue');
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockOfflineQueue = offlineQueue as jest.Mocked<typeof offlineQueue>;

// ── Test wrapper ──────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AuthProvider, null, children)
    );
  };
}

// ── Helper: set store to an authenticated state ───────────────────────────────

function setStoreAuthenticated() {
  useAuthStore.getState().setAuthenticated({
    session: { user: { id: 'user-123', email: 'test@test.com' } } as never,
    user: { id: 'user-123', email: 'test@test.com' } as never,
    profile: {
      id: 'user-123',
      email: 'test@test.com',
      display_name: 'Test User',
      role: 'user',
      points_balance: 0,
      is_premium: false,
      is_suspended: false,
      created_at: new Date().toISOString(),
    },
    role: 'user',
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset store
  useAuthStore.getState().setGuest();
  // Reset all mocks
  jest.clearAllMocks();
  // Default: offline queue does nothing
  mockOfflineQueue.clearForUser.mockResolvedValue(undefined);
  mockOfflineQueue.initialize.mockResolvedValue(undefined);
  // Bootstrap: getSession returns null (guest)
  mockAuthService.getSession.mockResolvedValue({ ok: true, data: null });
  mockAuthService.loadProfile.mockResolvedValue({
    ok: false,
    code: 'profile_fetch_failed',
    message: 'Not found',
  });
  mockAuthService.classifyAuthFailure.mockReturnValue({
    code: 'unknown',
    message: 'error',
    isTransient: false,
    isAuthError: false,
  });
  mockAuthService.clearPersistedSession.mockResolvedValue(undefined);
});

describe('refreshUser() demotion rules', () => {
  it('demotes to GUEST when getSession returns an error', async () => {
    mockAuthService.getSession.mockResolvedValueOnce({
      ok: false,
      code: 'session_fetch_failed',
      message: 'Network error',
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    // Set authenticated first so we can observe demotion
    act(() => setStoreAuthenticated());
    expect(useAuthStore.getState().sessionStatus).toBe('AUTHENTICATED_USER');

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(useAuthStore.getState().sessionStatus).toBe('GUEST');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('demotes to GUEST when getSession returns null (no active session)', async () => {
    mockAuthService.getSession.mockResolvedValueOnce({ ok: true, data: null });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    act(() => setStoreAuthenticated());

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(useAuthStore.getState().sessionStatus).toBe('GUEST');
  });

  it('demotes to GUEST when loadProfile fails (no cached fallback)', async () => {
    mockAuthService.getSession.mockResolvedValueOnce({
      ok: true,
      data: {
        session: { user: { id: 'user-123' } } as never,
        user: { id: 'user-123' } as never,
      },
    });
    mockAuthService.loadProfile.mockResolvedValueOnce({
      ok: false,
      code: 'profile_fetch_failed',
      message: 'Profile not found',
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    act(() => setStoreAuthenticated());

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(useAuthStore.getState().sessionStatus).toBe('GUEST');
  });

  it('does NOT clear the offline queue when demoting to GUEST on session error', async () => {
    mockAuthService.getSession.mockResolvedValueOnce({
      ok: false,
      code: 'network_error',
      message: 'Network unavailable',
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    act(() => setStoreAuthenticated());

    await act(async () => {
      await result.current.refreshUser();
    });

    // Queue should NOT be cleared — it is preserved for replay after re-auth
    expect(mockOfflineQueue.clearForUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().sessionStatus).toBe('GUEST');
  });

  it('loads profile with allowCachedProfile: false during refreshUser', async () => {
    mockAuthService.getSession.mockResolvedValueOnce({
      ok: true,
      data: {
        session: { user: { id: 'user-123' } } as never,
        user: { id: 'user-123' } as never,
      },
    });
    mockAuthService.loadProfile.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'user-123',
        email: 'test@test.com',
        display_name: 'Test User',
        role: 'user',
        points_balance: 0,
        is_premium: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
      },
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    // Verify allowCachedProfile: false was passed (spec rule 7)
    expect(mockAuthService.loadProfile).toHaveBeenCalledWith(
      'user-123',
      { allowCachedProfile: false }
    );
  });
});

describe('requireAuth()', () => {
  it('returns false for a guest and sets the return intent in the store', () => {
    useAuthStore.getState().setGuest();

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    const canProceed = result.current.requireAuth({
      type: 'favorite_toggle',
      route: '/(tabs)',
      params: { bathroom_id: 'abc' },
    });

    expect(canProceed).toBe(false);
    expect(useAuthStore.getState().returnIntent).not.toBeNull();
    expect(useAuthStore.getState().returnIntent?.type).toBe('favorite_toggle');
  });

  it('returns true and does not set return intent for authenticated user', () => {
    act(() => setStoreAuthenticated());

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: createWrapper(),
    });

    const canProceed = result.current.requireAuth({
      type: 'favorite_toggle',
      route: '/(tabs)',
      params: { bathroom_id: 'abc' },
    });

    expect(canProceed).toBe(true);
    expect(useAuthStore.getState().returnIntent).toBeNull();
  });
});
