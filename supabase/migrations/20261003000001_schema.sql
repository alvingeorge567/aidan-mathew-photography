-- Aidan Mathew Photography — core schema
-- Public content is edited as a draft (jsonb) and copied to `published` on publish,
-- so the live site never shows unfinished edits.

create extension if not exists pgcrypto;

create type public.media_type as enum ('image', 'video');
create type public.processing_status as enum ('uploading', 'validating', 'processing', 'ready', 'failed');
create type public.publication_status as enum ('unpublished', 'published');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.booking_status as enum ('new', 'contacted', 'proposal_sent', 'confirmed', 'declined', 'cancelled');
create type public.inquiry_status as enum ('new', 'in_progress', 'closed', 'spam');
create type public.review_status as enum ('pending', 'approved', 'rejected', 'hidden');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.notification_status as enum ('pending', 'sending', 'sent', 'failed');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.random_reference(prefix text) returns text
language sql volatile as $$
  select prefix || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
$$;

-- ---------------------------------------------------------------- admins
create table public.admin_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- settings (single row)
create table public.site_settings (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- media
create table public.media_assets (
  id                     uuid primary key default gen_random_uuid(),
  uploaded_by            uuid references auth.users (id) on delete set null,
  media_type             public.media_type not null,
  title                  text not null default '',
  original_filename      text not null default '',
  mime_type              text,
  original_key           text not null,
  processed_key          text,
  poster_key             text,
  derivatives_prefix     text,
  derivatives            jsonb,
  duration_seconds       numeric(8, 3),
  width                  integer,
  height                 integer,
  byte_size              bigint,
  processing_status      public.processing_status not null default 'uploading',
  publication_status     public.publication_status not null default 'unpublished',
  public_prefix          text,
  public_derivatives     jsonb,
  has_unpublished_changes boolean not null default false,
  alt_text               text not null default '',
  caption                text not null default '',
  category               text not null default '',
  focal_x                smallint not null default 50 check (focal_x between 0 and 100),
  focal_y                smallint not null default 50 check (focal_y between 0 and 100),
  story_id               uuid,
  permission_confirmed   boolean not null default false,
  permission_notes       text not null default '',
  error_message          text,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index media_assets_status_idx on public.media_assets (processing_status, publication_status);
create index media_assets_type_idx on public.media_assets (media_type, created_at desc);
create index media_assets_category_idx on public.media_assets (category);

-- ---------------------------------------------------------------- editable content
create table public.pages (
  id                      uuid primary key default gen_random_uuid(),
  key                     text not null unique,
  title                   text not null,
  draft                   jsonb not null default '{}'::jsonb,
  published               jsonb,
  status                  public.content_status not null default 'draft',
  has_unpublished_changes boolean not null default false,
  published_at            timestamptz,
  updated_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.services (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  draft                   jsonb not null default '{}'::jsonb,
  published               jsonb,
  status                  public.content_status not null default 'draft',
  has_unpublished_changes boolean not null default false,
  sort_order              integer not null default 0,
  published_at            timestamptz,
  updated_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.stories (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  draft                   jsonb not null default '{}'::jsonb,
  published               jsonb,
  status                  public.content_status not null default 'draft',
  has_unpublished_changes boolean not null default false,
  sort_order              integer not null default 0,
  published_at            timestamptz,
  updated_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index stories_published_slug_idx on public.stories ((published ->> 'slug')) where status = 'published';

alter table public.media_assets
  add constraint media_assets_story_fk foreign key (story_id) references public.stories (id) on delete set null;

create table public.story_blocks (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.stories (id) on delete cascade,
  position   integer not null,
  block_type text not null check (block_type in ('text', 'image_full', 'image_pair', 'gallery', 'video', 'quote', 'cta')),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index story_blocks_story_idx on public.story_blocks (story_id, position);

create table public.films (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  draft                   jsonb not null default '{}'::jsonb,
  published               jsonb,
  status                  public.content_status not null default 'draft',
  has_unpublished_changes boolean not null default false,
  featured                boolean not null default false,
  sort_order              integer not null default 0,
  published_at            timestamptz,
  updated_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index films_published_slug_idx on public.films ((published ->> 'slug')) where status = 'published';

create table public.content_revisions (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid not null,
  snapshot     jsonb not null,
  published_by uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index content_revisions_entity_idx on public.content_revisions (entity_type, entity_id, created_at desc);

-- Where each media asset is used. entity_type: page | service | film | story | settings | portfolio | review
create table public.media_placements (
  id          uuid primary key default gen_random_uuid(),
  media_id    uuid not null references public.media_assets (id) on delete cascade,
  entity_type text not null,
  entity_id   text not null default '',
  slot        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (media_id, entity_type, entity_id, slot)
);
create index media_placements_entity_idx on public.media_placements (entity_type, entity_id);

-- ---------------------------------------------------------------- reviews
create table public.reviews (
  id                     uuid primary key default gen_random_uuid(),
  display_name           text not null check (char_length(display_name) between 1 and 120),
  review_text            text not null check (char_length(review_text) between 10 and 4000),
  rating                 smallint check (rating between 1 and 5),
  photo_media_id         uuid references public.media_assets (id) on delete set null,
  publication_permission boolean not null default false,
  submitter_email        text,
  event_type             text not null default '',
  source                 text not null default 'submission' check (source in ('submission', 'admin')),
  status                 public.review_status not null default 'pending',
  featured               boolean not null default false,
  admin_note             text not null default '',
  idempotency_key        uuid unique,
  moderated_by           uuid references auth.users (id) on delete set null,
  moderated_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, featured, created_at desc);

-- A client's words are never silently rewritten.
create or replace function public.protect_review_text() returns trigger
language plpgsql as $$
begin
  if new.review_text is distinct from old.review_text then
    raise exception 'Review text cannot be edited after submission. Hide the review and request a new one instead.';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- bookings
create table public.booking_requests (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.random_reference('BR'),
  status            public.booking_status not null default 'new',
  event_type        text not null,
  event_date        date,
  venue             text not null default '',
  city              text not null default '',
  service_slug      text not null default '',
  coverage_notes    text not null default '',
  name              text not null,
  partner_name      text not null default '',
  email             text not null,
  phone             text not null default '',
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'phone', 'either')),
  budget_range      text not null default '',
  message           text not null default '',
  referral_source   text not null default '',
  privacy_ack_at    timestamptz not null,
  idempotency_key   uuid not null unique,
  ip_hash           text,
  private_notes     text not null default '',
  status_changed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index booking_requests_status_idx on public.booking_requests (status, created_at desc);
create index booking_requests_date_idx on public.booking_requests (event_date, status);
create index booking_requests_email_idx on public.booking_requests (lower(email));

create table public.availability_blocks (
  id         uuid primary key default gen_random_uuid(),
  block_date date not null unique,
  reason     text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- inquiries
create table public.contact_inquiries (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default public.random_reference('IN'),
  status          public.inquiry_status not null default 'new',
  name            text not null,
  email           text not null,
  inquiry_type    text not null default 'General',
  phone           text not null default '',
  event_date      date,
  message         text not null,
  idempotency_key uuid not null unique,
  ip_hash         text,
  private_notes   text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index contact_inquiries_status_idx on public.contact_inquiries (status, created_at desc);

-- ---------------------------------------------------------------- jobs
create table public.processing_jobs (
  id           uuid primary key default gen_random_uuid(),
  media_id     uuid not null references public.media_assets (id) on delete cascade,
  source_key   text not null,
  replaces_key text,
  status       public.job_status not null default 'queued',
  attempts     integer not null default 0,
  max_attempts integer not null default 3,
  last_error   text,
  run_after    timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index processing_jobs_queue_idx on public.processing_jobs (status, run_after);

create table public.notification_jobs (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('booking_ack', 'booking_studio', 'inquiry_ack', 'inquiry_studio', 'review_studio')),
  to_email        text,
  payload         jsonb not null default '{}'::jsonb,
  related_type    text,
  related_id      uuid,
  status          public.notification_status not null default 'pending',
  attempts        integer not null default 0,
  max_attempts    integer not null default 6,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  locked_at       timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notification_jobs_queue_idx on public.notification_jobs (status, next_attempt_at);
create index notification_jobs_related_idx on public.notification_jobs (related_type, related_id);

-- ---------------------------------------------------------------- audit & rate limits
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------- triggers
do $$
declare t text;
begin
  foreach t in array array['admin_profiles','media_assets','pages','services','stories','story_blocks','films','reviews','booking_requests','contact_inquiries']
  loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create trigger reviews_protect_text before update on public.reviews
  for each row execute function public.protect_review_text();
