-- Beta bug report table for collecting crash context from beta testers.
-- All writes go through the submit-bug-report edge function (service role).
-- Users can read only their own reports.

create table if not exists public.beta_bug_reports (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  user_id           uuid        references auth.users(id) on delete set null,
  device_id         text        not null,
  screen_name       text        not null default 'unknown',
  error_message     text        not null default '',
  error_stack       text        not null default '',
  component_stack   text        not null default '',
  user_comment      text        not null default '',
  app_version       text        not null default '',
  os_name           text        not null default '',
  os_version        text        not null default '',
  device_model      text        not null default '',
  sentry_event_id   text,
  idempotency_key   text        not null,
  schema_version    smallint    not null default 1,
  captured_at       timestamptz not null
);

-- Deduplicate offline queue retries.
create unique index if not exists beta_bug_reports_idempotency_key_idx
  on public.beta_bug_reports (idempotency_key);

-- Rate-limit lookups: recent reports per device.
create index if not exists beta_bug_reports_device_created_idx
  on public.beta_bug_reports (device_id, created_at desc);

alter table public.beta_bug_reports enable row level security;

-- No INSERT/UPDATE/DELETE policies for users. All writes via service role edge function.
-- Authenticated users can view only their own reports.
create policy "Users can view own bug reports"
  on public.beta_bug_reports
  for select
  to authenticated
  using (user_id = auth.uid());
