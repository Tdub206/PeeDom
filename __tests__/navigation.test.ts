import { describe, expect, it } from '@jest/globals';

import { routes } from '@/constants/routes';
import { isAppRoute, routeFromSegments, toSafeRoute } from '@/lib/navigation';

describe('navigation guards', () => {
  it('accepts declared app routes and bathroom detail routes', () => {
    expect(isAppRoute(routes.tabs.map)).toBe(true);
    expect(isAppRoute(routes.auth.login)).toBe(true);
    expect(isAppRoute(routes.modal.addBathroom)).toBe(true);
    expect(isAppRoute('/modal/add-bathroom?draft_id=draft-123')).toBe(true);
    expect(isAppRoute(routes.modal.report)).toBe(true);
    expect(isAppRoute('/modal/report?bathroom_id=abc123')).toBe(true);
    expect(isAppRoute(routes.modal.submitCode)).toBe(true);
    expect(isAppRoute('/modal/submit-code?bathroom_id=abc123')).toBe(true);
    expect(isAppRoute(routes.modal.rateCleanliness)).toBe(true);
    expect(isAppRoute('/modal/rate-cleanliness?bathroom_id=abc123')).toBe(true);
    expect(isAppRoute(routes.modal.liveStatus)).toBe(true);
    expect(isAppRoute('/modal/live-status?bathroom_id=abc123')).toBe(true);
    expect(isAppRoute(routes.modal.updateAccessibility)).toBe(true);
    expect(isAppRoute('/modal/update-accessibility?bathroom_id=abc123')).toBe(true);
    expect(isAppRoute(routes.modal.claimBusiness)).toBe(true);
    expect(isAppRoute('/modal/claim-business?bathroom_id=abc123&draft_id=draft-123')).toBe(true);
    expect(isAppRoute('/bathroom/abc123')).toBe(true);
    expect(isAppRoute('/bathroom/abc123?from=login')).toBe(true);
  });

  it('rejects unknown routes and falls back safely', () => {
    expect(isAppRoute('/admin')).toBe(false);
    expect(toSafeRoute('/admin', routes.tabs.map)).toBe(routes.tabs.map);
  });

  it('converts active segments into a guarded return route', () => {
    expect(routeFromSegments(['(tabs)', 'profile'], routes.tabs.map)).toBe(routes.tabs.profile);
    expect(routeFromSegments([], routes.tabs.map)).toBe(routes.tabs.map);
  });
});
