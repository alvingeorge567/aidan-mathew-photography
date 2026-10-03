# Operations: backups, retention, caching and costs

## Backups

The database and the media files are backed up separately. **Supabase database backups do not include Storage files.**

**Database**
- Paid Supabase plans take daily backups (Dashboard → Database → Backups); Point-in-Time Recovery is an add-on.
- On any plan, take your own copy regularly, for example weekly and before big changes:
  `supabase db dump --linked -f backup-$(date +%F).sql` plus `supabase db dump --linked --data-only -f data-$(date +%F).sql`.
- Store copies somewhere other than Supabase. They contain clients' personal details, so keep them encrypted.

**Media**
- The irreplaceable files are the originals in the `media-originals` bucket. Derivatives can be regenerated from them.
- `node scripts/backup-media.mjs ./media-backup` downloads every original (and skips files already downloaded). Run it on a schedule and copy the folder to separate storage.

## Restoring

1. Create or choose a Supabase project. Apply the migrations if it's empty, then restore the data dump with `psql "$DATABASE_URL" -f data-YYYY-MM-DD.sql`.
2. Re-upload originals to `media-originals` under the same paths: `node scripts/backup-media.mjs --restore ./media-backup`.
3. Regenerate derivatives. In the SQL editor run:
   ```sql
   insert into processing_jobs (media_id, source_key)
   select id, original_key from media_assets where processing_status <> 'uploading';
   ```
   The worker will reprocess everything.
4. Re-publish media: open each published item and press Publish, or ask a developer to script it. Public copies are deliberately not backed up, because they're derived.
5. Test a page, a film and the admin before switching your domain over.

Practise a restore once, into a spare project, so you know it works.

## Retention and deletion

Collect only what's needed. The forms ask for nothing beyond what's needed to reply and plan.

**Automatic clean-up (on by default)**
- Uploads abandoned for 24 hours are removed (`ABANDONED_UPLOAD_HOURS`).
- Rate-limit counters are kept for 2 days.

**Optional automatic purge (`RETENTION_AUTO_PURGE=true`)**
- Every hour, it removes declined or cancelled booking requests and closed or spam inquiries not updated for `RETENTION_DAYS` (default 730 days).
- It also removes sent and failed email records older than 90 days.
- Confirmed bookings are business records and are never deleted automatically.

**Deleting one person's data on request** — in the SQL editor:
```sql
delete from booking_requests where lower(email) = lower('person@example.com');
delete from contact_inquiries where lower(email) = lower('person@example.com');
delete from notification_jobs where payload->>'email' = 'person@example.com' or to_email = 'person@example.com';
update reviews set submitter_email = null where lower(submitter_email) = lower('person@example.com');
```
Hide or reject their review in the admin if they ask for that too. Your backups will still contain the data until they age out; say so in your privacy notice.

Write your actual retention periods into the privacy page.

## Caching and unpublishing

- Published files live in the public bucket under a new random folder each time you publish. Republishing never reuses an old address.
- Public files are served with a one-hour cache. When you unpublish or delete, the files are removed immediately, but copies may stay in browser and CDN caches for up to an hour.
- Pages update within about a minute of publishing; admin actions refresh them straight away.
- Anything a visitor has already downloaded or screenshotted can't be recalled.

## Storage and bandwidth (estimates)

- A photo original is typically 5–25 MB, and its four web versions are about 1–2 MB together.
- A 15-second video original is up to the upload limit. Its web versions are about 5–15 MB (720p plus 1080p).
- Bandwidth is driven by visitors watching films and viewing galleries. Pages load small previews first and load films only when someone presses play. The hero video uses the 720p version on phones.
- Watch usage in Supabase (Dashboard → Usage). The Free plan's storage and egress allowances suit testing; a busy studio site will likely need a paid plan. Check current pricing before upgrading.

## Monitoring

- The admin dashboard shows media still processing, items that failed, and emails that failed.
- Worker logs show each job. Restart the worker if it stops; queued jobs wait safely.
- Jobs stuck "running" (for example, after a crash) are picked up again automatically after 20 minutes.
