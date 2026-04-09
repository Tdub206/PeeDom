import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

// Server-side Supabase client for Server Components, Route Handlers,
// and Server Actions. Reads the session cookie written by the
// middleware so `supabase.auth.getUser()` is trustworthy.
//
// IMPORTANT: Always prefer `supabase.auth.getUser()` over
// `getSession()` in server code — getUser() validates the JWT
// against Supabase, getSession() trusts whatever is in the cookie.
export async function createSupabaseServerClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `cookies().set()` throws when called from a Server Component
          // that isn't a Route Handler or Server Action. That's fine —
          // the middleware will refresh the cookie on the next request.
        }
      },
    },
  });
}
