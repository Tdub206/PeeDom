# Reviewer Demo Account — setup guide

Google Play (and Apple, when we get there) review sometimes requires credentials for features locked behind auth. StallPass's core map is open, but submission, favorites, and code reveal require an account. Provide these credentials in Play Console → **App content → App access**.

## Create the account (once, in production Supabase)

1. In your password manager, generate a new strong password and save it under "StallPass — Play reviewer."
2. Sign up inside a production build of StallPass using:
   - **Email:** `playreviewer@stallpass.app` (create this mailbox or alias first; route it to support@stallpass.app)
   - **Password:** from password manager
   - **Display name:** `Play Reviewer`
3. Verify the email via the Supabase confirmation link.
4. Open the Supabase SQL editor and run the seed script below.

## Seed script — pre-populated state for the reviewer account

> Run this in the Supabase SQL editor after the reviewer has signed up and confirmed their email. Replace `<REVIEWER_USER_ID>` with the UUID from `auth.users` where email = 'playreviewer@stallpass.app'.

```sql
-- 1. Grab the reviewer user ID
with reviewer as (
  select id as user_id from auth.users where email = 'playreviewer@stallpass.app'
)
-- 2. Pre-populate 3 favorites (pick 3 stable, well-known public bathrooms in your DB)
insert into public.favorites (user_id, bathroom_id, created_at)
select r.user_id, b.id, now()
from reviewer r
cross join lateral (
  select id from public.bathrooms
  where is_active = true
  order by created_at asc
  limit 3
) b
on conflict do nothing;

-- 3. Attribute one existing submission to them (for the profile to show "1 submission").
-- This assumes at least one pre-seeded bathroom exists and can be safely reattributed
-- to the reviewer. If you do not want to reattribute, skip this block and have the
-- reviewer submit one themselves during account prep.
with reviewer as (
  select id as user_id from auth.users where email = 'playreviewer@stallpass.app'
)
update public.bathrooms b
set submitted_by = r.user_id
from reviewer r
where b.id = (
  select id from public.bathrooms
  where submitted_by is null and is_active = true
  order by created_at asc
  limit 1
);

-- 4. Record one code contribution (only if codes table exists; schema-dependent).
-- Check your codes/coupons table name before running. Example:
-- insert into public.bathroom_codes (bathroom_id, code, submitted_by, is_verified)
-- select b.id, 'DEMO1234', r.user_id, true
-- from reviewer r
-- join public.bathrooms b on b.submitted_by = r.user_id
-- limit 1;
```

## Notes to paste into Play Console's "App access" field

```
StallPass works as a guest without an account. Core features (map, search, accessibility
filters, emergency mode) require no login. To exercise account-gated features, sign in:

  Email:    playreviewer@stallpass.app
  Password: [provided separately in the "Access instructions" box]

This account has 3 favorites, 1 attributed submission, and 1 community code contribution
pre-seeded. Key flows to test:

  1. Tap the large orange "Go Now" button on the map tab → emergency flow + Maps handoff.
  2. Sign in via Profile tab → Settings → Sign in. Pre-populated favorites appear.
  3. Tap a favorite → open detail → see accessibility notes, rating, optional code.
  4. Filter: open Filters → "Wheelchair accessible" → map/list prune.
  5. The rewarded-ad gate for code reveal only applies to listings that are NOT
     marked free. Bathrooms marked free-to-use reveal their code without any ad.
```

## Refresh cadence

Rotate the password every 6 months. Re-seed favorites and submissions if the reviewer account state drifts (e.g., reviewer left rogue content behind). Keep the email active indefinitely — Play may revisit.
