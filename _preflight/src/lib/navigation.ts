import type { Href, Router } from 'expo-router';
import { routes } from '@/constants/routes';

type SafeRouter = Pick<Router, 'push' | 'replace'>;
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

const STATIC_ROUTES = new Set<string>(
  [
    routes.tabs.map,
    routes.tabs.search,
    routes.tabs.favorites,
    routes.tabs.profile,
    routes.tabs.business,
    routes.auth.login,
    routes.auth.register,
    routes.modal.report,
  ]
    .map((route) => getRoutePath(route))
    .filter((route): route is string => Boolean(route))
);

const BATHROOM_DETAIL_ROUTE_PATTERN = /^\/bathroom\/[^/]+$/;

export function isAppRoute(route: RouteInput): boolean {
  const routePath = getRoutePath(route);
  return Boolean(routePath && (STATIC_ROUTES.has(routePath) || BATHROOM_DETAIL_ROUTE_PATTERN.test(routePath)));
}

export function toSafeRoute(route: RouteInput, fallbackRoute: Href): Href {
  if (route && isAppRoute(route)) {
    return route;
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
