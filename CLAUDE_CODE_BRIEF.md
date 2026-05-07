# StallPass Business Dashboard — Claude Code Brief
**Date:** April 19, 2026  
**Scope:** Complete the `apps/business-web` Next.js app using a finished HTML prototype as the design reference. Wire every missing feature to Supabase. Ship nothing that can't pass `tsc --noEmit`.

---

## 1. What you are working with

### Repository layout
```
StallPass/
├── apps/business-web/          ← Next.js 14 App Router (YOUR TARGET)
│   ├── src/app/(dashboard)/    ← all authenticated pages live here
│   ├── src/lib/business/       ← queries.ts + schemas.ts
│   ├── src/lib/supabase/       ← client/server/database.ts
│   └── tailwind.config.ts      ← design tokens (keep in sync with mobile)
├── _preflight/supabase/migrations/   ← reference schema (001, 002, 003)
│   └── (live migrations are in the Supabase project dashboard)
└── __tests__/                  ← Jest tests for mobile API layer
```

### Design reference — HTML prototype
`StallPass Business Dashboard.html` (project root) is a **complete hi-fi prototype** of every screen. Use it as the definitive UI spec. Do not invent layouts — port them. Key files:
- `dashboard/styles.css` — design tokens and component CSS
- `dashboard/hub.jsx`, `locations.jsx`, `analytics.jsx`, `coupons.jsx`, `codes.jsx`, `featured.jsx`, `claims.jsx`, `settings.jsx`
- `dashboard/ai.jsx` — AI assistant panel (Claude-powered)
- `dashboard/notifs.jsx` — notifications slide-out panel

### Design tokens (Tailwind — `tailwind.config.ts`)
```
brand-600 = #3459e6    (primary blue)
brand-700 = #2846b8    (hover state)
brand-50  = #eef4ff    (soft bg)
ink-900   = #111827    (headings)
ink-600   = #4b596c    (body)
ink-500   = #66758a    (muted)
surface-base = #f6f7fb
surface-card = #ffffff
surface-muted = #e9eef6
surface-strong = #d5deeb
success = #1f8a5b
warning = #b7791f
danger  = #c24141
radius-4xl = 1.75rem
shadow-card = 0 2px 12px rgba(17,24,39,0.04)
shadow-pop  = 0 8px 28px rgba(52,89,230,0.25)
```
Font: system stack (`ui-sans-serif, system-ui…`) — no Google Fonts.

---

## 2. What already exists and works (DO NOT REWRITE)

| Page/feature | File(s) | Status |
|---|---|---|
| Auth (login, session, middleware) | `(auth)/`, `middleware.ts` | ✅ Complete |
| Dashboard layout + sidebar | `(dashboard)/layout.tsx` | ✅ Complete |
| Sign-out button | `sign-out-button.tsx` | ✅ Complete |
| Hub page (basic stats + actions) | `(dashboard)/hub/page.tsx` | ✅ Works, needs enhancement (see §4.1) |
| Locations list | `(dashboard)/locations/page.tsx` | ✅ Works, needs photo strip (§4.3) |
| Location detail — visibility toggles | `(dashboard)/locations/[id]/` | ✅ Fully wired via `upsert_business_bathroom_settings` RPC |
| Coupons — list + create | `(dashboard)/coupons/` | ✅ Fully wired via `create_business_coupon` RPC |
| `getApprovedLocations` / `getApprovedLocationById` | `lib/business/queries.ts` | ✅ Ownership-safe |
| Zod schemas | `lib/business/schemas.ts` | ✅ Used throughout |

### Established patterns — follow these exactly
1. **Server actions:** `'use server'` · Zod parse input first · `getApprovedLocationById` ownership check · RPC call · `revalidatePath` · return `{ ok: true, ... } | { ok: false, error: string }`. See `locations/[id]/actions.ts`.
2. **Client forms:** `'use client'` · `useTransition` + `isPending` · `SaveState = 'idle' | 'saving' | 'success' | 'error'` · reset draft on success · `router.refresh()`. See `coupons/create-coupon-form.tsx`.
3. **RPC type additions:** add to `BusinessWebFunctions` in `lib/supabase/database.ts`.
4. **Zod schemas:** add to `lib/business/schemas.ts`, export types.
5. **Ownership guard:** ALWAYS call `getApprovedLocationById` before any mutation. Never trust client-supplied `bathroom_id` alone.

---

## 3. The access codes system — critical context

The `bathroom_access_codes` table is **community-driven**, not business-set:
- Users submit codes · other users vote them up/down · a trigger recalculates `up_votes`/`down_votes`
- Codes have `confidence_score`, `lifecycle_status` (`active`/`expired`/`superseded`), `visibility_status`
- Guests must pay/earn points to *reveal* a code value (`grant_bathroom_code_reveal_access` RPC)
- The mobile `access-codes` API uses: `submit_bathroom_access_code`, `vote_on_code`, `grant_bathroom_code_reveal_access`

**Business owners get a privileged path** — they can submit an authoritative code that: auto-gets `confidence_score = 100`, supersedes prior codes, and is visible to guests without the reveal paywall. This RPC **does not exist yet** and must be created.

---

## 4. Full build list

### 4.1 Hub page — enhance to match prototype
**File:** `(dashboard)/hub/page.tsx`

The prototype hub (`dashboard/hub.jsx`) shows:
- Hero card (gradient blue) with location count and two CTA buttons
- 4-column stat grid: Locations · Weekly reach · Active coupons · Pending claims
- Quick action tiles (4-up grid): Locations / Coupons / Access codes / Featured
- Recent activity feed (hardcoded for now — see §4.8 for real version)
- Location summary list with impression counts

Changes needed:
- Pull `active_offer_count` from `get_business_dashboard_analytics` RPC (already in `ApprovedLocation` type via `active_offer_count` field)
- Add pending claims count: query `business_claims` where `claimant_user_id = user.id AND review_status = 'pending'`
- Add the Quick actions grid (links to `/locations`, `/coupons`, `/codes`, `/featured`)
- Add a location summary list below (same data as locations page, condensed)

No new RPCs needed. All data is already fetched.

---

### 4.2 Access codes page — NEW, fully wired

#### 4.2a New Supabase migration
Create a new migration file. Follow existing migration numbering. Add two RPCs:

```sql
-- RPC 1: Business owner submits authoritative code
-- Security: SECURITY DEFINER, ownership check inside
create or replace function public.submit_business_owner_access_code(
  p_bathroom_id uuid,
  p_code_value  text
)
returns table (code_id uuid, created_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  v_code_id uuid;
begin
  -- Ownership guard (double-enforced: app layer + DB layer)
  if not exists (
    select 1 from public.business_claims
    where bathroom_id      = p_bathroom_id
      and claimant_user_id = auth.uid()
      and review_status    = 'approved'
  ) then
    raise exception 'NOT_BUSINESS_OWNER' using errcode = 'P0001';
  end if;

  -- Sanitize
  p_code_value := trim(p_code_value);
  if length(p_code_value) < 1 then
    raise exception 'INVALID_CODE_VALUE' using errcode = 'P0001';
  end if;

  -- Supersede all prior active codes atomically
  update public.bathroom_access_codes
     set lifecycle_status = 'superseded', updated_at = now()
   where bathroom_id      = p_bathroom_id
     and lifecycle_status = 'active';

  -- Insert authoritative code
  insert into public.bathroom_access_codes (
    bathroom_id, submitted_by, code_value,
    confidence_score, visibility_status, lifecycle_status, last_verified_at
  )
  values (
    p_bathroom_id, auth.uid(), p_code_value,
    100, 'visible', 'active', now()
  )
  returning id into v_code_id;

  return query select v_code_id, now()::timestamptz;
end;
$$;

grant execute on function public.submit_business_owner_access_code(uuid, text)
  to authenticated;

-- RPC 2: Business owner reads full code values (bypasses reveal paywall)
create or replace function public.get_business_location_codes(
  p_bathroom_id uuid
)
returns table (
  id                uuid,
  code_value        text,
  confidence_score  numeric,
  up_votes          integer,
  down_votes        integer,
  lifecycle_status  text,
  visibility_status text,
  last_verified_at  timestamptz,
  created_at        timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.business_claims
    where bathroom_id      = p_bathroom_id
      and claimant_user_id = auth.uid()
      and review_status    = 'approved'
  ) then
    raise exception 'NOT_BUSINESS_OWNER' using errcode = 'P0001';
  end if;

  return query
    select c.id, c.code_value, c.confidence_score,
           c.up_votes, c.down_votes,
           c.lifecycle_status, c.visibility_status,
           c.last_verified_at, c.created_at
      from public.bathroom_access_codes c
     where c.bathroom_id = p_bathroom_id
     order by c.created_at desc;
end;
$$;

grant execute on function public.get_business_location_codes(uuid)
  to authenticated;
```

#### 4.2b Add types to `database.ts`
```ts
submit_business_owner_access_code: {
  Args: { p_bathroom_id: string; p_code_value: string };
  Returns: Array<{ code_id: string; created_at: string }>;
};
get_business_location_codes: {
  Args: { p_bathroom_id: string };
  Returns: Array<{
    id: string;
    code_value: string;
    confidence_score: number;
    up_votes: number;
    down_votes: number;
    lifecycle_status: string;
    visibility_status: string;
    last_verified_at: string | null;
    created_at: string;
  }>;
};
```

#### 4.2c Add Zod schemas to `schemas.ts`
```ts
export const businessLocationCodeRowSchema = z.object({
  id: z.string().uuid(),
  code_value: z.string().min(1),
  confidence_score: z.number().nonnegative(),
  up_votes: z.number().int().nonnegative(),
  down_votes: z.number().int().nonnegative(),
  lifecycle_status: z.enum(['active', 'expired', 'superseded']),
  visibility_status: z.enum(['visible', 'needs_review', 'removed']),
  last_verified_at: dateTimeStringSchema.nullable(),
  created_at: dateTimeStringSchema,
});
export const businessLocationCodeRowsSchema = z.array(businessLocationCodeRowSchema);
export type BusinessLocationCodeRow = z.infer<typeof businessLocationCodeRowSchema>;

export const submitBusinessOwnerCodeSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid location.'),
  code_value: z.string().trim().min(1, 'Code cannot be empty.').max(20, 'Code must be 20 characters or fewer.'),
});
```

#### 4.2d Add query function to `queries.ts`
```ts
export async function getBusinessLocationCodes(
  supabase: BusinessSupabaseClient,
  userId: string,
  bathroomId: string
): Promise<{ codes: BusinessLocationCodeRow[]; error: string | null }> {
  // Ownership check first
  const { location, error: ownershipError } = await getApprovedLocationById(supabase, userId, bathroomId);
  if (ownershipError) return { codes: [], error: ownershipError };
  if (!location) return { codes: [], error: "Location not found on your account." };

  const { data, error } = await (supabase as unknown as GetBusinessLocationCodesRpcClient)
    .rpc('get_business_location_codes', { p_bathroom_id: bathroomId });

  if (error) return { codes: [], error: error.message };

  const parsed = businessLocationCodeRowsSchema.safeParse(data ?? []);
  if (!parsed.success) return { codes: [], error: 'Unable to load codes right now.' };
  return { codes: parsed.data, error: null };
}
```

#### 4.2e New server action
**File:** `(dashboard)/codes/actions.ts`

```ts
'use server';
// Follow actions.ts pattern exactly.
// submitBusinessOwnerCode(input: unknown): Promise<{ ok: true; codeId: string } | { ok: false; error: string; fieldErrors?: Record<string,string> }>
// - Zod parse with submitBusinessOwnerCodeSchema
// - getApprovedLocationById ownership check
// - rpc('submit_business_owner_access_code', ...)
// - Map postgres errors: NOT_BUSINESS_OWNER, INVALID_CODE_VALUE
// - revalidatePath('/codes') and revalidatePath('/hub')
```

#### 4.2f New page
**File:** `(dashboard)/codes/page.tsx`

Server component. For each approved location:
- Fetch codes via `getBusinessLocationCodes`
- Show location name, code value (masked by default, reveal on click), confidence score badge, vote counts, lifecycle badge
- Include `<AccessCodeForm bathroomId={...} />` client component below each location's code list

**File:** `(dashboard)/codes/access-code-form.tsx`

Client component. Follow `visibility-settings-form.tsx` exactly for save state pattern:
- Input field for new code value
- Warning: "Submitting a new code supersedes all existing codes for this location"
- Save/saving/success/error states
- On success: `router.refresh()`

**UI reference:** `dashboard/codes.jsx` in the prototype. Key interactions:
- Masked code (`••••`) with show/hide toggle
- "Rotate code" → expands inline input → save
- Per-location toggle: "Require code" (this maps to `bathrooms.is_locked` — wire to `upsert_business_bathroom_settings` which already handles this via `requires_premium_access`... actually `is_locked` is a separate field. See note below.)

> **Note on `is_locked`:** The `bathrooms` table has `is_locked boolean` which is separate from `requires_premium_access`. The current `upsert_business_bathroom_settings` RPC does NOT update `is_locked`. You should either: (a) add `p_is_locked` to that RPC, or (b) create a new `set_bathroom_lock_status` RPC. Option (a) is cleaner — add it to the existing RPC and the `updateBusinessBathroomSettingsSchema`.

---

### 4.3 Location detail — photo upload

**Files to modify:**
- `(dashboard)/locations/[id]/page.tsx` — add Photos section
- New: `(dashboard)/locations/[id]/photo-upload-form.tsx` (client component)
- New: `(dashboard)/locations/[id]/photo-actions.ts` (server action)

#### Supabase Storage setup
Create a bucket: `bathroom-photos` (public read, authenticated write). RLS policy on the bucket: only the business owner of the bathroom can upload.

```sql
-- Storage policy (add to migration)
-- bucket: bathroom-photos
-- path pattern: {bathroom_id}/{filename}
-- insert policy: auth.uid() must have approved claim for bathroom_id
```

#### Server action
```ts
// uploadBathroomPhoto(bathroomId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }>
// 1. getApprovedLocationById ownership check
// 2. supabase.storage.from('bathroom-photos').upload(`${bathroomId}/${Date.now()}-${file.name}`, file)
// 3. Return public URL
// 4. Optionally: write URL to a bathroom_photos table (if you want them listed)
```

#### UI (client component)
Follow the prototype exactly (`dashboard/locations.jsx` → `PhotoUploadCard`):
- Drag-and-drop zone + file input
- Preview grid with remove buttons
- Accepts `image/*`, communicates max 10MB
- Shows upload progress via `isPending`

---

### 4.4 Analytics page — NEW

**File:** `(dashboard)/analytics/page.tsx`

The `get_business_dashboard_analytics` RPC already returns per-location stats:
- `weekly_views`, `weekly_unique_visitors`, `weekly_navigation_count`, `monthly_unique_visitors`, `avg_cleanliness`, `total_ratings`, `total_favorites`, `open_reports`

No new RPCs needed for the MVP analytics page.

**What to build:**
- Aggregate totals across all locations (sum `weekly_views` etc.)
- 4-column stat grid: Total views · Unique visitors · Route opens · Avg cleanliness
- Per-location breakdown table: location name · weekly views · route opens · cleanliness · open issues · monthly reach
- Use the prototype's UI reference (`dashboard/analytics.jsx`) for layout

**Important:** The prototype has time-series area charts (7/30/90 day). Those require a separate time-series RPC that does not exist yet. For the MVP page, skip the chart and note it as a follow-up. Focus on the stat grid and table — those use real data immediately.

**Route:** Add `(dashboard)/analytics/` folder with `page.tsx`.

---

### 4.5 Featured placements page — NEW

**File:** `(dashboard)/featured/page.tsx`

Check mobile codebase for the featured placements table schema (likely `featured_placements` or `bathroom_featured_placements`). The prototype UI is at `dashboard/featured.jsx`.

For MVP:
- Query existing featured placements for the user's locations
- Show a "how it works" 3-step explainer
- List active campaigns with impressions/clicks/CTR if available
- "Launch campaign" form: pick location, set daily budget, set duration
- If no featured placements RPC/table exists yet, build a read-only page with the explainer + empty state and a "Coming soon" note on the form

**Route:** Add `(dashboard)/featured/` folder.

---

### 4.6 Claims page — NEW (separate page, not just hub)

**File:** `(dashboard)/claims/page.tsx`

Data already available: `business_claims` table, filtered by `claimant_user_id`.

Build:
- Query `business_claims` directly (no new RPC needed — RLS `claims_select_own` policy is in place)
- Table showing: location name, address, submitted date, reviewed date, status badge
- `pending` claims show a "under review" warning banner
- "New claim" button → opens a modal form → `createBusinessClaim` server action → inserts into `business_claims`

For the new claim server action:
```ts
// Input: { bathroom_id?: string, address: string, business_name: string, contact_email: string, evidence_url?: string }
// Insert into business_claims with review_status = 'pending'
// revalidatePath('/claims')
```

The sidebar already shows a badge for pending claims (from `hub/page.tsx`). Wire it to the claims count.

---

### 4.7 Settings page — NEW

**File:** `(dashboard)/settings/page.tsx`

Three sections (all reference `dashboard/settings.jsx`):

**Profile** — update `profiles` table: `display_name`, `email` (read-only, comes from auth). Simple server action: `updateBusinessProfile`. Zod validate, update `profiles` where `id = auth.uid()`.

**Notifications** — For MVP: store preferences in `profiles` JSONB or a new `notification_preferences` table. If out of scope, render the UI with a "Saving preferences coming soon" note — do not leave it silently non-functional.

**Security** — "Change password" button: call `supabase.auth.updateUser({ password })` via a client action. "Enable 2FA" → link to Supabase docs/dashboard for now.

**Danger zone** — "Delete account": require typing "DELETE" to confirm → call a server action that calls `supabase.auth.admin.deleteUser` (requires service role key, so this may need to be a Supabase Edge Function, not a Next.js server action). For MVP, show the UI + fire a "confirmation email sent" toast.

---

### 4.8 Sidebar badge — wire to live data

**File:** `(dashboard)/layout.tsx`

The sidebar currently has a hardcoded nav. The prototype shows a badge on "Claim History" for pending claims. Wire it:
- In `DashboardLayout`, after fetching the user, also fetch pending claim count:
  ```ts
  const { count } = await supabase
    .from('business_claims')
    .select('*', { count: 'exact', head: true })
    .eq('claimant_user_id', user.id)
    .eq('review_status', 'pending');
  ```
- Pass `pendingClaimsCount` down to the sidebar nav and render a badge on the Claims link.

---

### 4.9 AI assistant panel

**File:** New `(dashboard)/components/ai-panel.tsx` (client component)

The prototype (`dashboard/ai.jsx`) uses `window.claude.complete()` which is a sandbox-only helper. In the real app, create a Route Handler:

**File:** `app/api/ai/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages } = await req.json();

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT, // same prompt from dashboard/ai.jsx
    messages,
  });

  return NextResponse.json({ text: response.content[0].type === 'text' ? response.content[0].text : '' });
}
```

The client component (`ai-panel.tsx`) calls `/api/ai` instead of `window.claude.complete`. Inject the business context (location names, stats) server-side by fetching before rendering the panel and passing as props.

Wire the panel into the layout: a floating button in the bottom-right (or a topbar button as shown in the prototype). Render it as a fixed overlay, same pattern as the prototype.

---

### 4.10 Notifications panel

**File:** New `(dashboard)/components/notif-panel.tsx` (client component)

For MVP, notifications are read from a `notifications` table if it exists in the schema, or rendered as static placeholders with a "real-time coming soon" note.

If `notifications` table exists:
- Query `select * from notifications where user_id = auth.uid() order by created_at desc limit 20`
- `supabase.channel('notifications').on('postgres_changes', ...)` for real-time via Supabase Realtime

Wire the bell icon into `layout.tsx` topbar. The unread dot is count of `notifications where read = false`.

---

## 5. Sidebar navigation — add missing routes

**File:** `(dashboard)/layout.tsx`

Add these `SidebarLink` entries (they exist in the prototype but not the real app):
```tsx
<SidebarLink href="/analytics" icon={<BarChart3 size={18}/>}>Analytics</SidebarLink>
<SidebarLink href="/codes"     icon={<DoorOpen size={18}/>}>Access codes</SidebarLink>
<SidebarLink href="/featured"  icon={<Sparkles size={18}/>}>Featured</SidebarLink>
<SidebarLink href="/claims"    icon={<FileText size={18}/>}>Claim history</SidebarLink>
<SidebarLink href="/settings"  icon={<Settings size={18}/>}>Settings</SidebarLink>
```
The topbar should also render an "AI" button and bell icon (see prototype topbar).

---

## 6. Verification checklist

Run these before calling anything done:

- [ ] `cd apps/business-web && npx tsc --noEmit` — zero errors
- [ ] All new server actions have `getApprovedLocationById` ownership check before any DB write
- [ ] RLS: a user without an approved claim calling `submit_business_owner_access_code` gets `NOT_BUSINESS_OWNER`, not a data leak
- [ ] `confidence_score = 100` on business-submitted codes (test with a direct DB query)
- [ ] Old `active` codes are superseded atomically before new insert (check transaction)  
- [ ] All new Zod schemas exported from `schemas.ts`
- [ ] All new RPC types added to `database.ts` `BusinessWebFunctions`
- [ ] `revalidatePath` fires on every successful mutation
- [ ] `/api/ai` route handler requires auth — returns 401 for unauthenticated requests
- [ ] Photo upload: file size limit enforced server-side (not just client-side)
- [ ] No `any` casts in new TypeScript files
- [ ] Tailwind classes only reference tokens defined in `tailwind.config.ts`

---

## 7. Build order (recommended)

1. **Access codes** — highest operational impact, has full spec above
2. **Sidebar nav + missing routes** — unblocks testing all pages
3. **Claims page** — simple, no new RPCs, already have data
4. **Hub enhancements** — adds pending claim count, quick actions
5. **Analytics page** — real data, no new RPCs needed for MVP
6. **Settings page** — profile + notifications
7. **Photo upload** — needs Storage bucket setup
8. **AI panel** — needs `ANTHROPIC_API_KEY` in `.env.local`
9. **Featured placements** — depends on whether table exists
10. **Notifications** — depends on whether table exists

---

## 8. Things NOT to change

- `(auth)/` — login flow is complete
- `middleware.ts` — auth guard is correct
- `lib/business/queries.ts` — `getApprovedLocations` and `getApprovedLocationById` ownership pattern
- `(dashboard)/locations/[id]/actions.ts` — `upsertBusinessBathroomSettings` is correct
- `(dashboard)/coupons/` — fully wired, do not touch
- `tailwind.config.ts` — tokens must stay in sync with mobile `src/constants/colors.ts`
- Any existing migration files — append only, never edit existing migrations
