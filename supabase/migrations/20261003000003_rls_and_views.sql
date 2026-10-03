-- Row-level security. Visitors (anon) have NO direct table access: they read only the
-- public_* views below, which expose published content and safe columns. Form submissions
-- are written by the server with the service role after validation and rate limiting.

do $$
declare t text;
begin
  foreach t in array array['admin_profiles','site_settings','media_assets','pages','services','stories','story_blocks',
    'films','content_revisions','media_placements','reviews','booking_requests','availability_blocks',
    'contact_inquiries','processing_jobs','notification_jobs','audit_logs','rate_limits']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Admins manage everything through their authenticated session; is_admin() is checked per row.
do $$
declare t text;
begin
  foreach t in array array['site_settings','media_assets','pages','services','stories','story_blocks','films',
    'content_revisions','media_placements','reviews','booking_requests','availability_blocks','contact_inquiries',
    'processing_jobs','notification_jobs']
  loop
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Admin profiles: a signed-in user can see only their own row; no one can self-register as admin.
create policy "read own admin profile" on public.admin_profiles for select to authenticated using (user_id = auth.uid());

-- Audit log: admins can read and append; entries cannot be edited or deleted from the app.
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "admins append audit" on public.audit_logs for insert to authenticated with check (public.is_admin() and actor_id = auth.uid());

-- rate_limits: service role only (no policies).

-- ---------------------------------------------------------------- public views
create or replace view public.public_settings as
  select (data - 'notification_email') as data from public.site_settings where id = 1;

create or replace view public.public_pages as
  select key, published as content, published_at from public.pages where status = 'published';

create or replace view public.public_services as
  select id, published as content, sort_order, published_at from public.services where status = 'published';

create or replace view public.public_films as
  select id, published as content, featured, sort_order, published_at from public.films where status = 'published';

create or replace view public.public_stories as
  select id, published as content, sort_order, published_at from public.stories where status = 'published';

create or replace view public.public_media as
  select id, media_type, title, alt_text, caption, category, width, height, duration_seconds,
         focal_x, focal_y, public_prefix, public_derivatives as derivatives, published_at
    from public.media_assets
   where publication_status = 'published' and public_prefix is not null and public_derivatives is not null;

create or replace view public.public_portfolio as
  select m.*, p.sort_order
    from public.media_placements p
    join public.public_media m on m.id = p.media_id
   where p.entity_type = 'portfolio';

create or replace view public.public_reviews as
  select id, display_name, review_text, rating, photo_media_id, featured, event_type, created_at
    from public.reviews
   where status = 'approved' and publication_permission;

revoke all on public.public_settings, public.public_pages, public.public_services, public.public_films,
  public.public_stories, public.public_media, public.public_portfolio, public.public_reviews from anon, authenticated;
grant select on public.public_settings, public.public_pages, public.public_services, public.public_films,
  public.public_stories, public.public_media, public.public_portfolio, public.public_reviews to anon, authenticated;
