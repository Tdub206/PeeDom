-- ============================================================================
-- StallPass Bathroom Photos
-- Adds storage-backed photo metadata for user-submitted bathroom photos.
-- ============================================================================

create table if not exists public.bathroom_photos (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'bathroom-photos',
  storage_path text not null unique,
  content_type text not null,
  file_size_bytes bigint,
  width integer,
  height integer,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_bathroom_photos_bathroom on public.bathroom_photos(bathroom_id);
create index if not exists idx_bathroom_photos_uploaded_by on public.bathroom_photos(uploaded_by);
create unique index if not exists idx_bathroom_photos_primary on public.bathroom_photos(bathroom_id) where is_primary;

create or replace function public.normalize_primary_bathroom_photo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_primary then
    update public.bathroom_photos
    set is_primary = false
    where bathroom_id = new.bathroom_id
      and id <> new.id
      and is_primary = true;
  end if;

  return new;
end;
$$;

drop trigger if exists on_bathroom_photo_primary_change on public.bathroom_photos;

create trigger on_bathroom_photo_primary_change
  after insert or update of is_primary on public.bathroom_photos
  for each row execute function public.normalize_primary_bathroom_photo();

alter table public.bathroom_photos enable row level security;

create policy "bathroom_photos_select_public_or_owner"
  on public.bathroom_photos for select
  using (
    auth.uid() = uploaded_by
    or exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  );

create policy "bathroom_photos_insert_own"
  on public.bathroom_photos for insert
  with check (auth.uid() = uploaded_by);

create policy "bathroom_photos_update_own"
  on public.bathroom_photos for update
  using (auth.uid() = uploaded_by)
  with check (auth.uid() = uploaded_by);

create policy "bathroom_photos_delete_own"
  on public.bathroom_photos for delete
  using (auth.uid() = uploaded_by);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bathroom-photos',
  'bathroom-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "bathroom_photos_bucket_select_public"
  on storage.objects for select
  using (bucket_id = 'bathroom-photos');

create policy "bathroom_photos_bucket_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bathroom-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "bathroom_photos_bucket_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'bathroom-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'bathroom-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "bathroom_photos_bucket_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bathroom-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
