-- Server-side functions. SECURITY DEFINER functions pin search_path and check authorization themselves.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid() and active);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- booking workflow
create or replace function public.booking_transition_allowed(p_from public.booking_status, p_to public.booking_status)
returns boolean language sql immutable as $$
  select case p_from
    when 'new'           then p_to in ('contacted', 'declined', 'cancelled')
    when 'contacted'     then p_to in ('proposal_sent', 'declined', 'cancelled')
    when 'proposal_sent' then p_to in ('confirmed', 'declined', 'cancelled')
    when 'confirmed'     then p_to in ('cancelled')
    else false
  end;
$$;

-- Confirmation is serialized per date with a transaction-scoped advisory lock, so two
-- simultaneous confirmations cannot both pass the capacity check.
create or replace function public.update_booking_status(p_id uuid, p_status public.booking_status)
returns public.booking_requests
language plpgsql security definer set search_path = public as $$
declare
  r          public.booking_requests;
  v_capacity integer;
  v_count    integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into r from public.booking_requests where id = p_id for update;
  if not found then
    raise exception 'Booking request not found';
  end if;

  if not public.booking_transition_allowed(r.status, p_status) then
    raise exception 'A request that is % cannot be changed to %', replace(r.status::text, '_', ' '), replace(p_status::text, '_', ' ');
  end if;

  if p_status = 'confirmed' then
    if r.event_date is null then
      raise exception 'Add an event date before confirming this booking';
    end if;
    perform pg_advisory_xact_lock(hashtext('booking-date:' || r.event_date::text));

    if exists (select 1 from public.availability_blocks where block_date = r.event_date) then
      raise exception 'The date % is blocked as unavailable. Remove the block first to confirm.', r.event_date;
    end if;

    select greatest(coalesce((data ->> 'booking_capacity_per_date')::integer, 1), 1)
      into v_capacity from public.site_settings where id = 1;
    v_capacity := coalesce(v_capacity, 1);

    select count(*) into v_count from public.booking_requests
      where event_date = r.event_date and status = 'confirmed' and id <> r.id;

    if v_count >= v_capacity then
      raise exception 'Capacity reached: % confirmed booking(s) already on % (limit %)', v_count, r.event_date, v_capacity;
    end if;
  end if;

  update public.booking_requests
     set status = p_status, status_changed_at = now()
   where id = p_id
   returning * into r;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'booking.status_changed', 'booking_request', p_id::text, jsonb_build_object('status', p_status, 'reference', r.reference));

  return r;
end $$;
revoke all on function public.update_booking_status(uuid, public.booking_status) from public, anon;
grant execute on function public.update_booking_status(uuid, public.booking_status) to authenticated;

-- Public availability hint. Pending requests never reserve a date.
create or replace function public.date_availability(p_date date)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_capacity integer;
  v_count integer;
begin
  if p_date is null then return 'unknown'; end if;
  if p_date < current_date then return 'past'; end if;
  if exists (select 1 from public.availability_blocks where block_date = p_date) then return 'blocked'; end if;
  select greatest(coalesce((data ->> 'booking_capacity_per_date')::integer, 1), 1) into v_capacity from public.site_settings where id = 1;
  select count(*) into v_count from public.booking_requests where event_date = p_date and status = 'confirmed';
  if v_count >= coalesce(v_capacity, 1) then return 'full'; end if;
  return 'open';
end $$;
revoke all on function public.date_availability(date) from public;
grant execute on function public.date_availability(date) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- stories
create or replace function public.replace_story_blocks(p_story_id uuid, p_blocks jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.story_blocks where story_id = p_story_id;
  insert into public.story_blocks (story_id, position, block_type, data)
  select p_story_id, (ord - 1)::integer, elem ->> 'type', coalesce(elem -> 'data', '{}'::jsonb)
    from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) with ordinality as t(elem, ord);
end $$;
revoke all on function public.replace_story_blocks(uuid, jsonb) from public, anon;
grant execute on function public.replace_story_blocks(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- rate limiting (server only)
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------- worker job queues (service role only)
create or replace function public.claim_processing_job(p_worker text)
returns setof public.processing_jobs language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.processing_jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id = (
     select id from public.processing_jobs
      where (status = 'queued' and run_after <= now())
         or (status = 'running' and locked_at < now() - interval '20 minutes' and attempts < max_attempts)
      order by created_at
      for update skip locked
      limit 1)
  returning j.*;
end $$;
revoke all on function public.claim_processing_job(text) from public, anon, authenticated;
grant execute on function public.claim_processing_job(text) to service_role;

create or replace function public.claim_notification_job()
returns setof public.notification_jobs language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.notification_jobs n
     set status = 'sending', locked_at = now(), attempts = n.attempts + 1
   where n.id = (
     select id from public.notification_jobs
      where (status = 'pending' and next_attempt_at <= now())
         or (status = 'sending' and locked_at < now() - interval '10 minutes')
      order by created_at
      for update skip locked
      limit 1)
  returning n.*;
end $$;
revoke all on function public.claim_notification_job() from public, anon, authenticated;
grant execute on function public.claim_notification_job() to service_role;

-- ---------------------------------------------------------------- retention
-- Deletes personal data that is no longer needed. Confirmed bookings are business records
-- and are kept; delete them manually when your record-keeping obligations end.
create or replace function public.purge_personal_data(p_days integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bookings integer;
  v_inquiries integer;
  v_notifications integer;
begin
  if p_days < 30 then raise exception 'Retention must be at least 30 days'; end if;
  delete from public.booking_requests
   where status in ('declined', 'cancelled') and updated_at < now() - make_interval(days => p_days);
  get diagnostics v_bookings = row_count;
  delete from public.contact_inquiries
   where status in ('closed', 'spam') and updated_at < now() - make_interval(days => p_days);
  get diagnostics v_inquiries = row_count;
  delete from public.notification_jobs
   where status in ('sent', 'failed') and created_at < now() - interval '90 days';
  get diagnostics v_notifications = row_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object('bookings', v_bookings, 'inquiries', v_inquiries, 'notifications', v_notifications);
end $$;
revoke all on function public.purge_personal_data(integer) from public, anon, authenticated;
grant execute on function public.purge_personal_data(integer) to service_role;
