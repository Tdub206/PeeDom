import { readAnalyticsRuntimeConfig } from '@/lib/analytics-config';

const environment = process.env.EXPO_PUBLIC_ENV?.trim() || 'local';
const analyticsRuntimeConfig = readAnalyticsRuntimeConfig({
  EXPO_PUBLIC_ANALYTICS_ENABLED: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
  EXPO_PUBLIC_ANALYTICS_ENDPOINT: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT,
  EXPO_PUBLIC_ANALYTICS_WRITE_KEY: process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY,
  EXPO_PUBLIC_ANALYTICS_FLUSH_INTERVAL_MS: process.env.EXPO_PUBLIC_ANALYTICS_FLUSH_INTERVAL_MS,
});
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';

export const config = {
  appName: 'StallPass',
  env: environment,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  sentryDsn,
  sentry: {
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  },
  analytics: analyticsRuntimeConfig,

  // Map defaults
  map: {
    defaultRegion: {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
  },
  
  // Query client config
  query: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Feature flags
  features: {
    offlineMode: true,
    hapticFeedback: true,
    analyticsEnabled: analyticsRuntimeConfig.enabled,
  },
} as const;

export const isProductionEnv = environment === 'production';
