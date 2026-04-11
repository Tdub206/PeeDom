# StallPass Business Web

Next.js 15 companion app to the StallPass Expo mobile app. Business owners sign in here to manage their listings, hours, coupons, access codes, reports, and featured placements. Everything talks to the same Supabase project the mobile app uses, so any change made here appears on iOS/Android in real time (and vice versa).

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict)
- **Tailwind CSS** — color tokens mirror `../../src/constants/colors.ts`
- **@supabase/ssr** for cookie-based auth in Server Components, Route Handlers, and middleware
- **@tanstack/react-query** for client-side refetches/mutations
- **Zod** for env + form validation

## Getting started

```bash
cd apps/business-web
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
# (must match the values in ../../app.config.ts)
npm install
npm run dev
```

The dev server runs on [http://localhost:3030](http://localhost:3030) on purpose — port 3000 conflicts with the Expo web preview.

## Layout

```
apps/business-web/
├── middleware.ts                    # session refresh + auth gate
├── src/
│   ├── app/
│   │   ├── layout.tsx               # root layout (fonts, metadata)
│   │   ├── page.tsx                 # /, redirects to /hub or /login
│   │   ├── (auth)/
│   │   │   ├── login/               # email+password / magic-link
│   │   │   └── auth/callback/       # OAuth/magic-link exchange
│   │   └── (dashboard)/
│   │       ├── layout.tsx           # sidebar shell
│   │       ├── hub/                 # business hub (overview)
│   │       ├── locations/
│   │       ├── coupons/             # (stubbed)
│   │       ├── codes/               # (stubbed)
│   │       ├── analytics/           # (stubbed)
│   │       ├── featured/            # (stubbed)
│   │       └── claims/              # (stubbed)
│   ├── components/ui/               # shared primitives
│   └── lib/
│       ├── env.ts                   # validated public env
│       ├── utils.ts
│       └── supabase/
│           ├── client.ts            # browser client
│           ├── server.ts            # server component client
│           └── middleware.ts        # cookie refresher
└── tailwind.config.ts
```

## Shared types

The `@mobile/types/*` path alias in `tsconfig.json` reaches into `../../src/types/`, so we can import the same `BusinessDashboardBathroom`, `BusinessCoupon`, etc. that the mobile app uses. Any type change belongs in one place (`../../src/types/`) and both apps pick it up.

## Auth flow

1. `middleware.ts` runs on every request, validates the Supabase JWT with `getUser()`, refreshes the cookie if needed, and bounces unauthenticated users hitting protected routes to `/login?next=…`.
2. `/login` offers password + magic-link sign-in. Magic-link bounces through `/auth/callback?code=…` to exchange the code for a session.
3. Server Components call `createSupabaseServerClient()` which reads the refreshed cookie via `cookies()` and returns a client that respects RLS.

## Collaboration

This app is being built in tandem with Codex via copy-paste review messages. See the `TO CODEX` / `TO CLAUDE` blocks in the commit messages and session logs.
