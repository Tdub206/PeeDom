export const config = {
  appName: 'StallPass',
  env: process.env.EXPO_PUBLIC_ENV ?? 'local',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  
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
    analyticsEnabled: false,
  },
} as const;

export const isProductionEnv = config.env === 'production';
