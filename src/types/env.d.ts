declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_ENV?: 'local' | 'staging' | 'production';
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
    EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID?: string;
    ANDROID_GOOGLE_MAPS_API_KEY?: string;
    IOS_GOOGLE_MAPS_API_KEY?: string;
    ANDROID_ADMOB_APP_ID?: string;
    IOS_ADMOB_APP_ID?: string;
    EAS_PROJECT_ID?: string;
  }
}
