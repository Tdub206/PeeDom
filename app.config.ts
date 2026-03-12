import { ExpoConfig, ConfigContext } from 'expo/config';

const iosBuildNumber = process.env.IOS_BUILD_NUMBER?.trim() || '1';
const androidVersionCodeFromEnv = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '1', 10);
const androidVersionCode =
  Number.isFinite(androidVersionCodeFromEnv) && androidVersionCodeFromEnv > 0 ? androidVersionCodeFromEnv : 1;

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
    buildNumber: iosBuildNumber,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Pee-Dom uses your location to find nearby bathrooms and improve search relevance.',
    },
    config: {
      googleMapsApiKey: process.env.IOS_GOOGLE_MAPS_API_KEY || '',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.peedom.mobile',
    versionCode: androidVersionCode,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
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
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission: 'Pee-Dom lets you attach a bathroom photo to improve listing trust.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Pee-Dom uses your location to find nearby bathrooms and improve search relevance.',
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
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || 'local',
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
