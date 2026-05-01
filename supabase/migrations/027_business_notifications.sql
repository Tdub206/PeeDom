-- ============================================================================
-- StallPass Business Notifications
-- 027_business_notifications.sql
-- ============================================================================

-- Notification queue table for async push dispatch
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (
    notification_type in (
      'claim_approved',
      'claim_rejected',
      'business_report_filed',
      'featured_placement_approved'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_queue_pending
  on public.notification_queue (status, created_at asc)
  where status = 'pending';

create index if not exists idx_notification_queue_recipient
  on public.notification_queue (recipient_user_id, created_at desc);

alter table public.notification_queue enable row level security;

-- No direct user access — only service_role and triggers write/read

-- Trigger: notify on claim status change
create or replace function public.notify_claim_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire on status change
  if old.review_status = new.review_status then
    return new;
  end if;

  -- Only notify on approve or reject
  if new.review_status not in ('approved', 'rejected') then
    return new;
  end if;

  insert into public.notification_queue (
    recipient_user_id,
    notification_type,
    payload
  )
  values (
    new.claimant_user_id,
    case new.review_status
      when 'approved' then 'claim_approved'
      when 'rejected' then 'claim_rejected'
    end,
    jsonb_build_object(
      'claim_id', new.id,
      'bathroom_id', new.bathroom_id,
      'business_name', new.business_name,
      'review_status', new.review_status
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_claim_status_change on public.business_claims;
create trigger trg_notify_claim_status_change
  after update on public.business_claims
  for each row
  execute function public.notify_claim_status_change();

-- Trigger: notify business owner when a report is filed on their bathroom
create or replace function public.notify_business_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_place_name text;
begin
  -- Find the approved claim owner for this bathroom
  select claims.claimant_user_id, bathrooms.place_name
  into v_owner_id, v_place_name
  from public.business_claims claims
  join public.bathrooms bathrooms on bathrooms.id = claims.bathroom_id
  where claims.bathroom_id = new.bathroom_id
    and claims.review_status = 'approved'
  order by claims.reviewed_at desc nulls last
  limit 1;

  -- No approved claim owner — skip
  if v_owner_id is null then
    return new;
  end if;

  -- Don't notify if the business owner filed the report themselves
  if v_owner_id = new.reported_by then
    return new;
  end if;

  insert into public.notification_queue (
    recipient_user_id,
    notification_type,
    payload
  )
  values (
    v_owner_id,
    'business_report_filed',
    jsonb_build_object(
      'report_id', new.id,
      'bathroom_id', new.bathroom_id,
      'place_name', v_place_name,
      'report_type', new.report_type
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_business_new_report on public.bathroom_reports;
create trigger trg_notify_business_new_report
  after insert on public.bathroom_reports
  for each row
  execute function public.notify_business_new_report();
