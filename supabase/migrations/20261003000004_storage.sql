-- Storage buckets.
--   media-originals   private  source uploads (resumable TUS uploads by admins)
--   media-derivatives private  worker output; admin previews use short-lived signed URLs
--   media-public      public   ONLY copies of published, optimized derivatives
-- The 200 MB limit must not exceed your Supabase plan's global upload limit
-- (Dashboard → Storage → Settings). The Free plan caps uploads at 50 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-originals', 'media-originals', false, 52428800,
     array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']),
  ('media-derivatives', 'media-derivatives', false, 52428800, null),
  ('media-public', 'media-public', true, 52428800, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins upload originals" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media-originals' and public.is_admin());

create policy "admins read private media" on storage.objects
  for select to authenticated
  using (bucket_id in ('media-originals', 'media-derivatives') and public.is_admin());

create policy "admins delete private media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('media-originals', 'media-derivatives') and public.is_admin());

-- media-public has no insert/update/delete policies: only the server (service role) and the
-- worker write to it, and only when an admin publishes a Ready asset.
