import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Pee-Dom',
  slug: 'peedom-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'peedom',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.peedom.mobile',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Pee-Dom uses your location to show nearby bathrooms when you tap "Use My Location".',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.peedom.mobile',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ],
    config: {
      googleMaps: {
        // Never hardcode the key here — set ANDROID_GOOGLE_MAPS_API_KEY in EAS env
        apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Pee-Dom uses your location to show nearby bathrooms when you tap "Use My Location".',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY ?? '',
      },
    ],
    // ── Sentry ────────────────────────────────────────────────────────────────
    // Runtime DSN → EXPO_PUBLIC_SENTRY_DSN (loaded by src/lib/sentry.ts)
    // Build-time source map upload → SENTRY_AUTH_TOKEN in EAS Build env
    // Never hardcode auth token, org, or project slug in source control.
    [
      '@sentry/react-native/expo',
      {
        // These values are read from EAS Build environment variables at build time.
        // Set them in your EAS project settings → Environment Variables.
        authToken: process.env.SENTRY_AUTH_TOKEN,
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        url: process.env.SENTRY_URL ?? 'https://sentry.io/',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV ?? 'local',
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
