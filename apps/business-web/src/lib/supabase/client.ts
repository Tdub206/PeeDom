'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

// Browser-side Supabase client for React Query / useEffect /
// client components. Uses @supabase/ssr so cookies set here are
// visible to the server during the next request.
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
