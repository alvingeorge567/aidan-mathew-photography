-- Behavioural tests for policies and functions. Each check raises an exception on failure.
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
                              ('00000000-0000-0000-0000-00000000000b', 'visitor@example.com');
insert into public.admin_profiles (user_id, display_name) values ('00000000-0000-0000-0000-00000000000a', 'Owner');

-- Fixtures written as the service role (as the server does after validating a form).
insert into public.booking_requests (id, event_type, event_date, name, email, privacy_ack_at, idempotency_key, status) values
  ('10000000-0000-0000-0000-000000000001', 'Wedding', current_date + 100, 'A', 'a@example.com', now(), gen_random_uuid(), 'proposal_sent'),
  ('10000000-0000-0000-0000-000000000002', 'Wedding', current_date + 100, 'B', 'b@example.com', now(), gen_random_uuid(), 'proposal_sent'),
  ('10000000-0000-0000-0000-000000000003', 'Wedding', current_date + 200, 'C', 'c@example.com', now(), gen_random_uuid(), 'new');
insert into public.reviews (id, display_name, review_text, publication_permission, status) values
  ('20000000-0000-0000-0000-000000000001', 'Maya & Sam', 'An unforgettable experience from start to finish.', true, 'approved'),
  ('20000000-0000-0000-0000-000000000002', 'Pending Pair', 'Waiting for the studio to approve this one.', true, 'pending');
update public.pages set published = '{"heading":"Live"}', draft = '{"heading":"Unfinished draft"}', status = 'published' where key = 'about';
insert into public.media_assets (id, media_type, original_key, processing_status) values
  ('30000000-0000-0000-0000-000000000001', 'image', 'images/2026/10/x.jpg', 'ready');

-- 1. Visitors: published views only; no access to private tables.
set role anon;
do $$ begin
  if (select count(*) from public.public_reviews) <> 1 then raise exception 'anon should see exactly 1 approved review'; end if;
  if (select content->>'heading' from public.public_pages where key = 'about') <> 'Live' then raise exception 'public page must show the published version, not the draft'; end if;
  if (select count(*) from public.public_media) <> 0 then raise exception 'unpublished media must not be public'; end if;
  begin perform 1 from public.booking_requests; raise exception 'anon read booking_requests';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.media_assets; raise exception 'anon read media_assets';
  exception when insufficient_privilege then null; end;
  begin insert into public.reviews (display_name, review_text) values ('x', 'xxxxxxxxxxxx'); raise exception 'anon inserted a review directly';
  exception when insufficient_privilege then null; end;
  if (select data ? 'notification_email' from public.public_settings) then raise exception 'private notification email exposed'; end if;
  if public.date_availability(current_date + 100) <> 'open' then raise exception 'pending requests must not reserve a date'; end if;
end $$;
reset role;
\echo PASS visitors see only published content; private tables are inaccessible

-- 2. A signed-in user who is not an admin sees nothing private.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.booking_requests) <> 0 then raise exception 'non-admin can read bookings'; end if;
  if (select count(*) from public.pages) <> 0 then raise exception 'non-admin can read drafts'; end if;
  begin perform public.update_booking_status('10000000-0000-0000-0000-000000000001', 'confirmed'); raise exception 'non-admin confirmed a booking';
  exception when insufficient_privilege then null; end;
  begin insert into public.admin_profiles (user_id) values ('00000000-0000-0000-0000-00000000000b'); raise exception 'user made themselves admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo PASS non-admin users cannot read private data, confirm bookings or self-promote

-- 3. Admin: transitions and capacity.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.booking_requests) <> 3 then raise exception 'admin should see all bookings'; end if;
  begin perform public.update_booking_status('10000000-0000-0000-0000-000000000003', 'confirmed'); raise exception 'skipped workflow steps';
  exception when raise_exception then if sqlerrm like '%skipped%' then raise; end if; end;
  perform public.update_booking_status('10000000-0000-0000-0000-000000000001', 'confirmed');
  begin perform public.update_booking_status('10000000-0000-0000-0000-000000000002', 'confirmed'); raise exception 'capacity not enforced';
  exception when raise_exception then if sqlerrm not like 'Capacity reached%' then raise; end if; end;
  if public.date_availability(current_date + 100) <> 'full' then raise exception 'confirmed date should be full'; end if;
  if (select count(*) from public.audit_logs where action = 'booking.status_changed') <> 1 then raise exception 'status change not audited'; end if;
end $$;
reset role;
\echo PASS workflow transitions and per-date capacity are enforced

-- 4. Blocked dates cannot be confirmed.
insert into public.availability_blocks (block_date) values (current_date + 300);
update public.booking_requests set event_date = current_date + 300, status = 'proposal_sent' where id = '10000000-0000-0000-0000-000000000003';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin perform public.update_booking_status('10000000-0000-0000-0000-000000000003', 'confirmed'); raise exception 'blocked date confirmed';
  exception when raise_exception then if sqlerrm not like '%blocked%unavailable%' then raise; end if; end;
end $$;
reset role;
\echo PASS blocked dates cannot be confirmed

-- 5. Review text can't be rewritten; moderation fields can change.
do $$ begin
  update public.reviews set status = 'hidden' where id = '20000000-0000-0000-0000-000000000002';
  begin update public.reviews set review_text = 'Edited by someone else entirely.' where id = '20000000-0000-0000-0000-000000000001'; raise exception 'review text was edited';
  exception when raise_exception then if sqlerrm not like 'Review text cannot be edited%' then raise; end if; end;
end $$;
\echo PASS review text is immutable

-- 6. Story blocks replace atomically and keep order.
insert into public.stories (id, slug) values ('40000000-0000-0000-0000-000000000001', 'test-story');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
\o /dev/null
select public.replace_story_blocks('40000000-0000-0000-0000-000000000001', '[{"type":"text","data":{"body":"one"}},{"type":"quote","data":{"text":"two"}}]');
select public.replace_story_blocks('40000000-0000-0000-0000-000000000001', '[{"type":"cta","data":{}},{"type":"text","data":{"body":"x"}}]');
\o
do $$ begin
  if (select string_agg(block_type, ',' order by position) from public.story_blocks where story_id = '40000000-0000-0000-0000-000000000001') <> 'cta,text' then
    raise exception 'blocks not replaced in order'; end if;
end $$;
reset role;
\echo PASS story blocks are replaced in order

-- 7. Rate limiting, job claiming and retention guard (service role only).
set role service_role;
do $$ declare ok boolean; begin
  for i in 1..3 loop ok := public.hit_rate_limit('test-key', 3, 3600); end loop;
  if not ok then raise exception '3rd hit should pass'; end if;
  if public.hit_rate_limit('test-key', 3, 3600) then raise exception '4th hit should be limited'; end if;
  insert into public.processing_jobs (media_id, source_key) values ('30000000-0000-0000-0000-000000000001', 'images/2026/10/x.jpg');
  if (select count(*) from public.claim_processing_job('w1')) <> 1 then raise exception 'job not claimed'; end if;
  if (select count(*) from public.claim_processing_job('w2')) <> 0 then raise exception 'job claimed twice'; end if;
  begin perform public.purge_personal_data(5); raise exception 'short retention allowed';
  exception when raise_exception then if sqlerrm not like 'Retention must be%' then raise; end if; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform public.hit_rate_limit('x', 1, 60); raise exception 'anon called rate limiter';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_processing_job('x'); raise exception 'anon claimed a job';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo PASS rate limiting, single-claim job queue and retention guard

-- Setup for the concurrency test run by scripts/test-db.sh.
insert into public.booking_requests (id, event_type, event_date, name, email, privacy_ack_at, idempotency_key, status) values
  ('50000000-0000-0000-0000-000000000001', 'Wedding', current_date + 400, 'D', 'd@example.com', now(), gen_random_uuid(), 'proposal_sent'),
  ('50000000-0000-0000-0000-000000000002', 'Wedding', current_date + 400, 'E', 'e@example.com', now(), gen_random_uuid(), 'proposal_sent');
