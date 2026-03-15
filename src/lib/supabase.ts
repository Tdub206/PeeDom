import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';
import { buildSupabaseAuthStorageKey, supabaseAuthStorage, supabaseUserStorage } from '@/lib/supabase-auth-storage';
import { supabaseRuntimeConfig } from '@/lib/supabase-config';

let supabaseClient: SupabaseClient<Database> | null = null;

export const supabaseConfigState = supabaseRuntimeConfig;

function createSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseRuntimeConfig.supabaseUrl, supabaseRuntimeConfig.supabaseAnonKey, {
    auth: {
      storage: supabaseAuthStorage,
      userStorage: supabaseUserStorage,
      storageKey: buildSupabaseAuthStorageKey(supabaseRuntimeConfig.supabaseUrl),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseRuntimeConfig.isConfigured) {
    throw new Error(
      supabaseRuntimeConfig.errorMessage ??
        'Supabase runtime configuration is missing. Configure the required environment variables before launch.'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }

  return supabaseClient;
}
