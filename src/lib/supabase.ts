import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';
import { supabaseRuntimeConfig } from '@/lib/supabase-config';

let supabaseClient: SupabaseClient<Database> | null = null;

export const supabaseConfigState = supabaseRuntimeConfig;

const REQUEST_TIMEOUT_MS = 15_000;

function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const mergedInit: RequestInit = {
    ...init,
    signal: controller.signal,
  };

  return fetch(input, mergedInit).finally(() => {
    clearTimeout(timeoutId);
  });
}

function createSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseRuntimeConfig.supabaseUrl, supabaseRuntimeConfig.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: resilientFetch,
    },
    realtime: {
      params: {
        heartbeat_interval: 25,
      },
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
