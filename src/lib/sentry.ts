import * as Sentry from '@sentry/react-native';
import { config, isProductionEnv } from '@/constants/config';

let hasInitialized = false;

export interface SentryUserContext {
  id: string;
  isPremium?: boolean;
  role?: string | null;
}

function scrubString(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
}

export function initializeSentry(): void {
  if (hasInitialized) {
    return;
  }

  if (!config.sentry.dsn) {
    hasInitialized = true;
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    enabled: isProductionEnv,
    environment: config.env,
    tracesSampleRate: isProductionEnv ? config.sentry.tracesSampleRate : 0,
    sendDefaultPii: false,
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    beforeSend(event) {
      if (event.message) {
        event.message = scrubString(event.message);
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          message: typeof breadcrumb.message === 'string' ? scrubString(breadcrumb.message) : breadcrumb.message,
        }));
      }

      return event;
    },
  });

  hasInitialized = true;
}

export function setSentryUserContext(context: SentryUserContext | null): void {
  if (!hasInitialized || !config.sentry.dsn) {
    return;
  }

  if (!context) {
    Sentry.setUser(null);
    Sentry.setTag('auth_state', 'guest');
    return;
  }

  Sentry.setUser({
    id: context.id,
    role: context.role ?? undefined,
    segment: context.isPremium ? 'premium' : 'free',
  });
  Sentry.setTag('auth_state', 'authenticated');
  Sentry.setTag('user_role', context.role ?? 'user');
  Sentry.setTag('subscription_tier', context.isPremium ? 'premium' : 'free');
}

export { Sentry };
