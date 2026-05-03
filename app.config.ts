import { ExpoConfig, ConfigContext } from 'expo/config';

const {
  readBuildVersionConfig,
  readSentryBuildConfig,
  shouldRequireSentryBuildSecrets,
} = require('./build-config') as typeof import('./build-config');

const { iosBuildNumber, androidVersionCode } = readBuildVersionConfig(process.env);
const STATIC_EAS_PROJECT_ID = '9277c80b-8194-4229-8054-f5c6f70a8cbe';
const environment = process.env.EXPO_PUBLIC_ENV?.trim() || 'local';
const isProduction = environment === 'production';
const isEasBuilder =
  (process.env.EAS_BUILD?.trim() ?? '').length > 0 ||
  (process.env.CI?.trim() ?? '').toLowerCase() === 'true';
const sentryBuildConfig = readSentryBuildConfig(process.env, {
  requireSecrets: shouldRequireSentryBuildSecrets(process.env),
});
const testAndroidAdMobAppId = 'ca-app-pub-3940256099942544~3347511713';
const testIosAdMobAppId = 'ca-app-pub-3940256099942544~1458002511';
const androidAdMobAppId = process.env.ANDROID_ADMOB_APP_ID?.trim() || (isProduction ? '' : testAndroidAdMobAppId);
const iosAdMobAppId = process.env.IOS_ADMOB_APP_ID?.trim() || (isProduction ? '' : testIosAdMobAppId);
const googleMobileAdsConfig =
  androidAdMobAppId || iosAdMobAppId
    ? {
        android_app_id: androidAdMobAppId || undefined,
        ios_app_id: iosAdMobAppId || undefined,
        delay_app_measurement_init: true,
        optimize_initialization: true,
        optimize_ad_loading: true,
      }
    : undefined;
const buildPlugins: ExpoConfig['plugins'] = [
  [
    'expo-build-properties',
    {
      android: {
        extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
      },
    },
  ],
];

function readRequiredEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name]?.trim() ?? '';

  if (!value) {
    throw new Error(`Missing required environment variable for production build: ${name}`);
  }

  return value;
}

function readBooleanEnv(name: keyof NodeJS.ProcessEnv): boolean {
  return (process.env[name]?.trim().toLowerCase() ?? '') === 'true';
}

function readStaticEasProjectId(config: Partial<ExpoConfig>): string {
  if (!config.extra || typeof config.extra !== 'object') {
    return '';
  }

  const extra = config.extra as { eas?: { projectId?: string } };
  return typeof extra.eas?.projectId === 'string' ? extra.eas.projectId.trim() : '';
}

function assertProductionBuildEnv(easProjectId: string): void {
  // EAS CLI may parse app.config.ts locally before uploading the job.
  // Only enforce required production env on the actual builder/CI environment.
  if (!isProduction || !isEasBuilder) {
    return;
  }

  readRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
  readRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  readRequiredEnv('EXPO_PUBLIC_SENTRY_DSN');
  readRequiredEnv('ANDROID_GOOGLE_MAPS_API_KEY');

  if (!easProjectId) {
    throw new Error('Missing required EAS project ID for production build. Link the project with EAS or set EAS_PROJECT_ID.');
  }

  const rewardedAdsEnabled = (process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED?.trim() ?? 'true') !== 'false';

  if (rewardedAdsEnabled) {
    readRequiredEnv('ANDROID_ADMOB_APP_ID');
    readRequiredEnv('IOS_ADMOB_APP_ID');
    readRequiredEnv('EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID');

    if (!readBooleanEnv('EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED')) {
      throw new Error(
        'Missing required reward verification configuration for production build: EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED must be true after the AdMob server-side verification callback is configured.'
      );
    }
  }
}

if (googleMobileAdsConfig) {
  buildPlugins.push([
    'react-native-google-mobile-ads',
    {
      androidAppId: googleMobileAdsConfig.android_app_id,
      iosAppId: googleMobileAdsConfig.ios_app_id,
      delayAppMeasurementInit: googleMobileAdsConfig.delay_app_measurement_init,
      optimizeInitialization: googleMobileAdsConfig.optimize_initialization,
      optimizeAdLoading: googleMobileAdsConfig.optimize_ad_loading,
    },
  ]);
}

if (sentryBuildConfig.enabled) {
  buildPlugins.push([
    '@sentry/react-native/expo',
    {
      authToken: sentryBuildConfig.authToken || undefined,
      organization: sentryBuildConfig.organization || undefined,
      project: sentryBuildConfig.project || undefined,
      url: sentryBuildConfig.url || undefined,
    },
  ]);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId =
    process.env.EAS_PROJECT_ID?.trim() || readStaticEasProjectId(config) || STATIC_EAS_PROJECT_ID;

  if (sentryBuildConfig.errorMessage) {
    throw new Error(sentryBuildConfig.errorMessage);
  }

  assertProductionBuildEnv(easProjectId);
  const appVersion = '1.0.0';

  const expoConfig: ExpoConfig = {
    ...config,
    name: 'StallPass',
    slug: 'stallpass',
    owner: 'stallpass',
    version: appVersion,
    // Bare/native workflow builds require an explicit runtime version string.
    runtimeVersion: appVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'stallpass',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.stallpass.app',
      buildNumber: iosBuildNumber,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'StallPass uses your location to find nearby bathrooms and improve search relevance.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundImage: './assets/adaptive-icon-background.png',
      },
      package: 'com.stallpass.app',
      versionCode: androidVersionCode,
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'POST_NOTIFICATIONS',
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
      ...buildPlugins,
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-image-picker',
        {
          photosPermission: 'StallPass lets you attach a bathroom photo to improve listing trust.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'StallPass uses your location to find nearby bathrooms and improve search relevance.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2563eb',
          defaultChannel: 'default',
        },
      ],
      'expo-updates',
    ],
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      url: easProjectId ? `https://u.expo.dev/${easProjectId}` : undefined,
      checkAutomatically: 'ON_LOAD',
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: easProjectId,
      },
      // These are still available via Constants.expoConfig.extra if needed
      // but primary access should be via process.env.EXPO_PUBLIC_*
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_ENV: environment,
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED,
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID,
      EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED: process.env.EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED,
    },
  };

  return expoConfig;
};
