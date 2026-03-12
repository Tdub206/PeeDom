import * as Sentry from '@sentry/react-native';
import { config, isProductionEnv } from '@/constants/config';

let hasInitialized = false;

export function initializeSentry(): void {
  if (hasInitialized) {
    return;
  }

  if (!config.sentryDsn) {
    hasInitialized = true;
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    enabled: isProductionEnv,
    tracesSampleRate: isProductionEnv ? 0.1 : 0,
  });

  hasInitialized = true;
}

export { Sentry };
