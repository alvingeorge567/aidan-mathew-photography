# Security and privacy design

## Who can do what

| Actor | Can | Cannot |
|---|---|---|
| Visitor (no account) | Read published content through the `public_*` views; submit forms through server actions | Read any table directly, see drafts, originals, bookings, inquiries, notes or the notification email |
| Signed-in non-admin | Nothing beyond a visitor | Read or change anything private; make themselves an admin |
| Administrator | Manage content, media, reviews, bookings and inquiries through their own session (row-level security checks `is_admin()` on every row) | Edit a client's review text, skip booking stages, overbook a date, delete audit entries |
| Server (service role) | Insert validated form submissions; copy derivatives to the public bucket after an admin publishes | — |
| Worker (service role) | Process media and send queued emails | — |

## Layers of protection

1. **Database policies.** Row-level security is enabled on every table. Visitors have no table grants at all, and admin rights come from an `admin_profiles` row that only the service role can create. Booking status changes go through `update_booking_status()`, which checks the caller, the allowed transition, blocked dates and capacity under a per-date lock.
2. **Server checks.** Every admin page calls `requireAdmin()`, and every admin server action calls `requireAdminAction()`. Both verify the session with Supabase Auth (`getUser()`) and the admin row. The middleware redirect is a convenience, not the protection.
3. **Input handling.** Admin content is sanitised against declared schemas, so unknown fields are dropped and URLs must be http(s) or site paths. Public forms are validated with Zod. Admin text is rendered as plain text, never as HTML. External films are allowlisted (YouTube and Vimeo): the video ID is extracted and the embed URL rebuilt; embed HTML is never accepted.
4. **Uploads.**
   - The server generates every storage key; filenames are never used as paths.
   - Uploads go to a private bucket using the admin's own session.
   - The worker detects the real type from the file's bytes, re-checks size, measures duration with ffprobe and re-encodes everything.
   - Metadata, including GPS, is stripped from web versions. Only derivatives of published, permission-confirmed items reach the public bucket.
5. **Abuse controls.** Public forms use a honeypot field, a minimum fill time and per-IP rate limits (IPs are stored only as salted hashes). Idempotency keys stop duplicate submissions.
6. **Headers.** The site sends nosniff, a strict referrer policy, frame protection and a permissions policy. Admin and preview routes send `noindex` and are disallowed in robots.txt. That keeps them out of search results; it doesn't protect them — authentication does.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` bypasses all policies. Keep it only in the website's server environment and the worker. Never prefix it with `NEXT_PUBLIC_`, never commit it, and rotate it if exposed (Supabase → Project Settings → API).
- `RATE_LIMIT_SALT` and `RESEND_API_KEY` are server-only.
- No passwords are hardcoded anywhere. Administrators are created with `npm run admin:create`.

## Recommended additions

- Turn on MFA for the Supabase dashboard account and for administrators (Supabase Auth supports TOTP).
- If spam gets through, add a CAPTCHA such as Cloudflare Turnstile to the three public forms. The forms are structured to accept one.
- Review the audit log (`audit_logs` table) occasionally.
