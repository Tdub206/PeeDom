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
    // Apple Maps by default - no Google Maps config needed for Phase 1
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
        apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY || '',
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
        androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY || '',
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
      projectId: process.env.EAS_PROJECT_ID || '',
    },
    // These are still available via Constants.expoConfig.extra if needed
    // but primary access should be via process.env.EXPO_PUBLIC_*
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || 'local',
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
