insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-logos',
  'brand-logos',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload brand logos to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'brand-logos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
