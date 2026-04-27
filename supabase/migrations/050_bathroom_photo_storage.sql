-- Migration: 050_bathroom_photo_storage
-- Hardens the existing bathroom-photos bucket configuration for the
-- business dashboard upload flow. Bucket policies already exist in
-- 004_bathroom_photos.sql and 005_trust_engine.sql, so this migration
-- only ensures the bucket itself is present and aligned with the web app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bathroom-photos',
  'bathroom-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'bathroom-photos';
