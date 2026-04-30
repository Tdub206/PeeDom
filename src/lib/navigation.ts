import type { Href, Router } from 'expo-router';
import { routes } from '@/constants/routes';

type SafeRouter = Pick<Router, 'push' | 'replace' | 'dismissTo'>;
type RouteInput = Href | string | null | undefined;

function getRoutePath(route: RouteInput): string | null {
  if (!route) {
    return null;
  }

  if (typeof route === 'string') {
    return route.split('#')[0]?.split('?')[0] ?? null;
  }

  return route.pathname;
}

function collectStaticRoutePaths(value: unknown, routePaths: Set<string>): void {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    const routePath = getRoutePath(value);

    if (routePath) {
      routePaths.add(routePath);
    }

    return;
  }

  if (typeof value === 'function' || typeof value !== 'object') {
    return;
  }

  const routeObject = value as { pathname?: unknown };

  if (typeof routeObject.pathname === 'string') {
    const routePath = getRoutePath(value as RouteInput);

    if (routePath) {
      routePaths.add(routePath);
    }

    return;
  }

  Object.values(value as Record<string, unknown>).forEach((entry) => {
    collectStaticRoutePaths(entry, routePaths);
  });
}

const STATIC_ROUTES = (() => {
  const routePaths = new Set<string>();
  collectStaticRoutePaths(
    {
      tabs: routes.tabs,
      auth: routes.auth,
      business: routes.business,
      modal: routes.modal,
      legal: routes.legal,
    },
    routePaths
  );

  const adminRoutePath = getRoutePath(routes.tabs.admin);

  if (adminRoutePath) {
    routePaths.delete(adminRoutePath);
  }

  return routePaths;
})();

const BATHROOM_DETAIL_ROUTE_PATTERN = /^\/bathroom\/[^/]+$/;
const SOURCE_CANDIDATE_ROUTE_PATTERN = /^\/candidate\/[^/]+$/;
const BUSINESS_LOCATION_ROUTE_PATTERN = /^\/business\/location\/[^/]+$/;
const BUSINESS_SUBROUTE_PATTERN = /^\/business\/(locations|analytics|coupons|claims|featured)$/;

export function isAppRoute(route: RouteInput): boolean {
  const routePath = getRoutePath(route);
  return Boolean(
    routePath &&
      (STATIC_ROUTES.has(routePath) ||
        BATHROOM_DETAIL_ROUTE_PATTERN.test(routePath) ||
        SOURCE_CANDIDATE_ROUTE_PATTERN.test(routePath) ||
        BUSINESS_LOCATION_ROUTE_PATTERN.test(routePath) ||
        BUSINESS_SUBROUTE_PATTERN.test(routePath))
  );
}

export function toSafeRoute(route: RouteInput, fallbackRoute: Href): Href {
  if (route && isAppRoute(route)) {
    return route as Href;
  }

  return fallbackRoute;
}

export function routeFromSegments(segments: string[], fallbackRoute: Href): string {
  const publicSegments = segments.filter(
    (segment) => segment && !segment.startsWith('(') && segment !== 'index'
  );

  if (!publicSegments.length) {
    return getRoutePath(fallbackRoute) ?? '/';
  }

  return getRoutePath(toSafeRoute(`/${publicSegments.join('/')}`, fallbackRoute)) ?? '/';
}

export function pushSafely(router: SafeRouter, route: RouteInput, fallbackRoute: Href): void {
  router.push(toSafeRoute(route, fallbackRoute));
}

export function replaceSafely(router: SafeRouter, route: RouteInput, fallbackRoute: Href): void {
  router.replace(toSafeRoute(route, fallbackRoute));
}

export function dismissToSafely(router: SafeRouter, route: RouteInput, fallbackRoute: Href): void {
  router.dismissTo(toSafeRoute(route, fallbackRoute));
}
