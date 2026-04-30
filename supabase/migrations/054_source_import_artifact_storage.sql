-- Migration: 054_source_import_artifact_storage
-- Creates the private storage bucket used by server-side public dataset
-- import runs to archive raw artifacts and normalized manifests.

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'source-import-artifacts',
  'source-import-artifacts',
  false,
  array['application/json']
)
on conflict (id) do nothing;

update storage.buckets
set
  public = false,
  allowed_mime_types = array['application/json']
where id = 'source-import-artifacts';
