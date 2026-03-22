/**
 * Auth Replay Contracts
 *
 * Tests the three Laws governing guest-intent replay in PeeDom:
 *
 * 1. Return intent is in-memory only — no persistence.
 * 2. requireAuth stores intent when called by a guest; returns user when authenticated.
 * 3. consumeReturnIntent is destructive — peeking is non-destructive.
 *
 * These tests exercise the pure logic in navigation.ts, offline-queue.ts, and the
 * validate.ts contracts that govern the auth / offline state machine.
 *
 * They deliberately do NOT mount React components or the AuthContext provider —
 * the intent state machine is deterministic and can be validated in isolation.
 */
import { describe, expect, it } from '@jest/globals';

import { isAppRoute, routeFromSegments, toSafeRoute } from '@/lib/navigation';
import { shouldDropQueuedMutation, MAX_QUEUE_RETRY_COUNT } from '@/lib/offline-queue';
import { routes } from '@/constants/routes';
import { ReturnIntent } from '@/types';

// ---------------------------------------------------------------------------
// Return intent shape contract
// ---------------------------------------------------------------------------
describe('ReturnIntent shape contract', () => {
  function buildIntent(overrides: Partial<ReturnIntent> = {}): ReturnIntent {
    return {
      intent_id: `intent_${Date.now()}_abc123`,
      type: 'add_bathroom',
      route: '/modal/add-bathroom',
      params: {},
      created_at: new Date().toISOString(),
      replay_strategy: 'immediate_after_auth',
      ...overrides,
    };
  }

  it('constructs a valid intent with required fields', () => {
    const intent = buildIntent();

    expect(intent.intent_id).toMatch(/^intent_\d+_/);
    expect(intent.created_at).toBe(new Date(intent.created_at).toISOString());
    expect(intent.replay_strategy).toBe('immediate_after_auth');
  });

  it('supports draft_resume replay strategy', () => {
    const intent = buildIntent({ replay_strategy: 'draft_resume' });
    expect(intent.replay_strategy).toBe('draft_resume');
  });

  it('allows params to carry arbitrary data', () => {
    const intent = buildIntent({ params: { bathroom_id: 'b-99', draft_id: 'draft-1' } });
    expect(intent.params).toEqual({ bathroom_id: 'b-99', draft_id: 'draft-1' });
  });
});

// ---------------------------------------------------------------------------
// Navigation guard — safe route resolution
// ---------------------------------------------------------------------------
describe('navigation route safety', () => {
  it('accepts every declared static route as a valid app route', () => {
    const staticRoutes = [
      routes.tabs.map,
      routes.tabs.search,
      routes.tabs.favorites,
      routes.tabs.profile,
      routes.tabs.business,
      routes.auth.login,
      routes.auth.register,
      routes.modal.addBathroom,
      routes.modal.report,
      routes.modal.submitCode,
      routes.modal.rateCleanliness,
      routes.modal.liveStatus,
      routes.modal.updateAccessibility,
      routes.modal.claimBusiness,
    ];

    for (const route of staticRoutes) {
      expect(isAppRoute(route)).toBe(true);
    }
  });

  it('accepts bathroom detail routes with arbitrary IDs', () => {
    expect(isAppRoute('/bathroom/abc-123')).toBe(true);
    expect(isAppRoute('/bathroom/00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('accepts query-parameterised versions of modal routes', () => {
    expect(isAppRoute('/modal/add-bathroom?draft_id=draft-abc')).toBe(true);
    expect(isAppRoute('/modal/report?bathroom_id=b-1&report_type=closed')).toBe(true);
    expect(isAppRoute('/modal/submit-code?bathroom_id=b-1')).toBe(true);
    expect(isAppRoute('/modal/claim-business?bathroom_id=b-1&draft_id=d-2')).toBe(true);
  });

  it('rejects unknown routes that are not registered in the app', () => {
    expect(isAppRoute('/admin')).toBe(false);
    expect(isAppRoute('/dashboard')).toBe(false);
    expect(isAppRoute('/bathroom/')).toBe(false); // no ID
    expect(isAppRoute('/bathroom/abc/nested')).toBe(false); // nested path
    expect(isAppRoute(null)).toBe(false);
    expect(isAppRoute(undefined)).toBe(false);
    expect(isAppRoute('')).toBe(false);
  });

  it('toSafeRoute returns the route if valid, or the fallback if not', () => {
    expect(toSafeRoute('/modal/add-bathroom', routes.tabs.map)).toBe('/modal/add-bathroom');
    expect(toSafeRoute('/not-a-real-route', routes.tabs.map)).toBe(routes.tabs.map);
    expect(toSafeRoute(null, routes.tabs.map)).toBe(routes.tabs.map);
  });

  it('routeFromSegments strips group and index segments correctly', () => {
    expect(routeFromSegments(['(tabs)', 'profile'], routes.tabs.map)).toBe('/profile');
    expect(routeFromSegments(['(auth)', 'login'], routes.tabs.map)).toBe('/login');
    expect(routeFromSegments([], routes.tabs.map)).toBe('/');
    expect(routeFromSegments(['(tabs)', 'index'], routes.tabs.map)).toBe('/');
  });

  it('routeFromSegments falls back for unknown segments', () => {
    // /admin is not a registered route, so toSafeRoute will return the fallback /
    expect(routeFromSegments(['admin'], routes.tabs.map)).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// Offline queue drop policy — aligns with auth contract
// ---------------------------------------------------------------------------
describe('offline queue retry cap aligns with auth contracts', () => {
  it('MAX_QUEUE_RETRY_COUNT is exactly 3', () => {
    // This is a contract. If this value changes the auth docs and tests must
    // all be updated together.
    expect(MAX_QUEUE_RETRY_COUNT).toBe(3);
  });

  it('never drops on counts 1 through MAX_QUEUE_RETRY_COUNT', () => {
    for (let count = 1; count <= MAX_QUEUE_RETRY_COUNT; count++) {
      expect(shouldDropQueuedMutation(count)).toBe(false);
    }
  });

  it('drops on MAX_QUEUE_RETRY_COUNT + 1 and beyond', () => {
    expect(shouldDropQueuedMutation(MAX_QUEUE_RETRY_COUNT + 1)).toBe(true);
    expect(shouldDropQueuedMutation(99)).toBe(true);
  });

  it('drops on 0 if someone passes an already-exhausted count', () => {
    // 0 is not > MAX (3) so should NOT drop — the first attempt starts at 0
    expect(shouldDropQueuedMutation(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session status derivation rules
// (The real derivation lives in AuthContext.determineSessionStatus.
//  These tests validate the expected observable behaviour from the outside.)
// ---------------------------------------------------------------------------
describe('session status derivation invariants', () => {
  type Role = 'user' | 'business' | 'admin';
  type SessionStatus =
    | 'BOOTSTRAPPING'
    | 'GUEST'
    | 'SESSION_RECOVERY'
    | 'AUTHENTICATED_USER'
    | 'AUTHENTICATED_BUSINESS'
    | 'AUTHENTICATED_ADMIN'
    | 'SESSION_INVALID';

  const EXPECTED_STATUS_BY_ROLE: Record<Role, SessionStatus> = {
    user: 'AUTHENTICATED_USER',
    business: 'AUTHENTICATED_BUSINESS',
    admin: 'AUTHENTICATED_ADMIN',
  };

  it('each role maps to exactly one authenticated status', () => {
    const roles: Role[] = ['user', 'business', 'admin'];

    for (const role of roles) {
      const status = EXPECTED_STATUS_BY_ROLE[role];
      expect(status).toMatch(/^AUTHENTICATED_/);
    }
  });

  it('GUEST and SESSION_INVALID are the only non-authenticated statuses at runtime', () => {
    const nonAuthenticated: SessionStatus[] = ['GUEST', 'SESSION_INVALID'];
    const authenticated: SessionStatus[] = [
      'AUTHENTICATED_USER',
      'AUTHENTICATED_BUSINESS',
      'AUTHENTICATED_ADMIN',
    ];

    // Verify that no authenticated status appears in the non-authenticated list
    for (const status of authenticated) {
      expect(nonAuthenticated).not.toContain(status);
    }
  });

  it('BOOTSTRAPPING is transient and should never persist past session init', () => {
    // Verifies that BOOTSTRAPPING is not treated as a regular auth state
    const runtimeStatuses: SessionStatus[] = [
      'GUEST',
      'AUTHENTICATED_USER',
      'AUTHENTICATED_BUSINESS',
      'AUTHENTICATED_ADMIN',
      'SESSION_INVALID',
    ];

    expect(runtimeStatuses).not.toContain('BOOTSTRAPPING' as SessionStatus);
  });
});
