do $$
declare
  moderation_constraint_name text;
begin
  select conname
  into moderation_constraint_name
  from pg_constraint
  where conrelid = 'public.bathrooms'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%moderation_status%';

  if moderation_constraint_name is not null then
    execute format('alter table public.bathrooms drop constraint %I', moderation_constraint_name);
  end if;
end
$$;

alter table public.bathrooms
  add constraint bathrooms_moderation_status_check
  check (moderation_status in ('active', 'flagged', 'hidden', 'deleted', 'unverified'));

create index if not exists idx_reports_closed_recent
  on public.bathroom_reports (bathroom_id, created_at desc)
  where report_type = 'closed' and status in ('open', 'reviewing');

create or replace function public.refresh_bathroom_report_moderation(target_bathroom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_report_count integer := 0;
begin
  if target_bathroom_id is null then
    return;
  end if;

  select count(*)::integer
  into closed_report_count
  from public.bathroom_reports
  where bathroom_id = target_bathroom_id
    and report_type = 'closed'
    and status in ('open', 'reviewing')
    and created_at >= now() - interval '24 hours';

  if closed_report_count > 3 then
    update public.bathrooms
    set
      moderation_status = 'unverified',
      updated_at = now()
    where id = target_bathroom_id
      and moderation_status = 'active';
  end if;
end;
$$;

create or replace function public.sync_bathroom_moderation_from_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_bathroom_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_bathroom_id := old.bathroom_id;
  else
    affected_bathroom_id := new.bathroom_id;
  end if;

  perform public.refresh_bathroom_report_moderation(affected_bathroom_id);

  if tg_op = 'UPDATE' and new.bathroom_id is distinct from old.bathroom_id then
    perform public.refresh_bathroom_report_moderation(old.bathroom_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_bathroom_report_change on public.bathroom_reports;

create trigger on_bathroom_report_change
  after insert or update or delete on public.bathroom_reports
  for each row execute function public.sync_bathroom_moderation_from_reports();
