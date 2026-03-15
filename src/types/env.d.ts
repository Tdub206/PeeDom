declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_ENV?: 'local' | 'staging' | 'preview' | 'ci' | 'production';
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
    ANDROID_GOOGLE_MAPS_API_KEY?: string;
    IOS_GOOGLE_MAPS_API_KEY?: string;
    EAS_PROJECT_ID?: string;
    EAS_BUILD_PROFILE?: 'development' | 'preview' | 'production';
    IOS_BUILD_NUMBER?: string;
    ANDROID_VERSION_CODE?: string;
  }
}
