-- Initial rows. Nothing here is published: the owner reviews and publishes each item.
-- Default page copy lives in src/lib/content/pages.ts and is merged in by the editor.

insert into public.site_settings (id, data) values (1, jsonb_build_object(
  'business_name', 'Aidan Mathew Photography LLC',
  'tagline', 'Weddings · Events · Cinematography',
  'booking_capacity_per_date', 1
)) on conflict (id) do nothing;

insert into public.pages (key, title) values
  ('home', 'Home'),
  ('about', 'About'),
  ('storytelling', 'Storytelling'),
  ('services', 'Services'),
  ('portfolio', 'Portfolio'),
  ('films', 'Films'),
  ('reviews', 'Reviews'),
  ('booking', 'Booking'),
  ('contact', 'Contact'),
  ('privacy', 'Privacy'),
  ('terms', 'Terms')
on conflict (key) do nothing;

-- Starting service categories from the brief. Unpublished drafts: hide any the studio does not offer.
insert into public.services (slug, sort_order, draft) values
  ('wedding-cinematography', 1, '{"title":"Wedding Cinematography","slug":"wedding-cinematography","sort_order":1}'),
  ('wedding-photography', 2, '{"title":"Wedding Photography","slug":"wedding-photography","sort_order":2}'),
  ('engagement-and-pre-wedding', 3, '{"title":"Engagement and Pre-Wedding","slug":"engagement-and-pre-wedding","sort_order":3}'),
  ('event-photography-and-video', 4, '{"title":"Event Photography and Video","slug":"event-photography-and-video","sort_order":4}'),
  ('livestreaming', 5, '{"title":"Livestreaming","slug":"livestreaming","sort_order":5}')
on conflict (slug) do nothing;
