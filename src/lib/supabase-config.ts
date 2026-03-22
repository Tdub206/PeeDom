const REQUIRED_SUPABASE_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export type RequiredSupabaseEnvKey = (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];

export interface SupabaseRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  missingKeys: RequiredSupabaseEnvKey[];
  isConfigured: boolean;
  errorMessage: string | null;
}

export function readSupabaseRuntimeConfig(
  env: Partial<Record<RequiredSupabaseEnvKey, string | undefined>>
): SupabaseRuntimeConfig {
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

  const missingKeys = REQUIRED_SUPABASE_ENV_KEYS.filter((key) => {
    return !env[key]?.trim();
  });

  return {
    supabaseUrl,
    supabaseAnonKey,
    missingKeys,
    isConfigured: missingKeys.length === 0,
    errorMessage:
      missingKeys.length > 0
        ? `Missing required Supabase environment variables: ${missingKeys.join(', ')}.`
        : null,
  };
}

export const supabaseRuntimeConfig = readSupabaseRuntimeConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
