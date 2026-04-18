import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';

// Session refresh + auth gate. Runs on every matched request via
// the top-level `middleware.ts`. Two jobs:
//   1. Keep the Supabase access token fresh in the request cookies
//      so server components downstream see a valid session.
//   2. Redirect unauthenticated users hitting protected routes to
//      `/login?next=<original path>`.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request,
  });

  const env = getPublicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // This call refreshes the token if needed and writes new cookies.
  // We MUST call getUser (not getSession) so the JWT is validated.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes that require an authenticated business user.
  const isProtected =
    pathname.startsWith('/hub') ||
    pathname.startsWith('/locations') ||
    pathname.startsWith('/coupons') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/claims') ||
    pathname.startsWith('/featured') ||
    pathname.startsWith('/codes') ||
    pathname.startsWith('/reports');

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return copyResponseCookies(response, NextResponse.redirect(loginUrl));
  }

  // If a signed-in user hits /login, bounce them to the hub.
  if (user && pathname === '/login') {
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = '/hub';
    hubUrl.search = '';
    return copyResponseCookies(response, NextResponse.redirect(hubUrl));
  }

  return response;
}

function copyResponseCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}
