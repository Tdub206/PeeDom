export const config = {
  env: process.env.EXPO_PUBLIC_ENV ?? 'local',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  
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
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Feature flags
  features: {
    offlineMode: true,
    hapticFeedback: true,
    analyticsEnabled: false,
  },
} as const;
