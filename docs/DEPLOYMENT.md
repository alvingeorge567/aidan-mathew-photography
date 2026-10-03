# Deployment

Nothing in this project purchases services or publishes the site. Each step below is done by the owner, with their own accounts.

## What runs where

| Service | Hosts | Notes |
|---|---|---|
| Website and admin (Next.js) | Vercel, Netlify, Render, or any Node 20+ host | Stateless; scales normally |
| Media and email worker | A host that runs a long-lived process with FFmpeg: Railway, Fly.io, Render background worker, or a small VPS | Can't run on serverless functions (FFmpeg jobs are long) |
| Database, auth, file storage | Supabase | One project |
| Transactional email | Resend (built in); other providers can be added in `worker/src/email.ts` | Optional at first; emails queue until configured |

## 1. Supabase project

1. Create a project at supabase.com.
2. **Upload size.** The brief proposes 200 MB per video. The Supabase Free plan caps any upload at 50 MB, so either:
   - use a paid plan and raise the global limit (Dashboard → Storage → Settings) to at least 200 MB, or
   - set `NEXT_PUBLIC_MAX_VIDEO_MB=50` everywhere and change `209715200` to `52428800` in `supabase/migrations/20261003000004_storage.sql` before applying it.

   A 15-second 1080p clip exported for the web is usually 10–40 MB, so 50 MB is often enough.
3. **Turn off public sign-ups:** Authentication → Sign In / Providers → disable "Allow new users to sign up". (Even if left on, a new account has no admin access, but there's no reason to allow it.)
4. Authentication → URL Configuration: set the Site URL to your domain.
5. Apply the database, in order, with the Supabase CLI (`supabase link`, then `supabase db push`) or by pasting into the SQL editor:
   - `supabase/migrations/20261003000001_schema.sql`
   - `supabase/migrations/20261003000002_functions.sql`
   - `supabase/migrations/20261003000003_rls_and_views.sql`
   - `supabase/migrations/20261003000004_storage.sql`
   - `supabase/seed.sql`

   Do **not** run anything in `supabase/tests/` against Supabase — those files are for local PostgreSQL only.
6. Note the project URL, anon key and service-role key (Project Settings → API).

Supabase's database linter may flag the `public_*` views as "security definer views". That is intentional: they are the only way visitors read data, and they expose only published rows and safe columns.

## 2. Website

1. Set the environment variables from `.env.example` (website section) on your host. `SUPABASE_SERVICE_ROLE_KEY` and `RATE_LIMIT_SALT` must be server-only, never prefixed `NEXT_PUBLIC_`.
2. Build command `npm run build`, start command `npm start` (Vercel detects this automatically).
3. Point your domain at the host and set `NEXT_PUBLIC_SITE_URL` to it.

## 3. Worker

Build from the repository root so shared rules are included:

```bash
docker build -f worker/Dockerfile -t amp-media-worker .
docker run --env-file worker.env amp-media-worker
```

Or without Docker on a machine with FFmpeg installed: `cd worker && npm ci && npm start`.

Give it at least 1 vCPU, 1–2 GB RAM and free temporary disk of about twice the largest upload. One worker is plenty for a single studio; more can run safely in parallel because jobs are claimed with row locks. The worker stops cleanly on SIGTERM after finishing its current job.

Check it's working: upload a photo in the admin. It should reach **Ready** within seconds. If items stay at **Validating**, the worker isn't running or can't reach Supabase — check its logs.

## 4. Email (optional at launch)

1. Create a Resend account and verify your sending domain.
2. On the worker set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (an address on the verified domain) and `SITE_URL`.
3. In Admin → Settings set the public email and "Send new requests to".

Until this is done, requests and inquiries are still saved; their emails wait in the queue (shown as pending on each request) and are sent once email is configured.

## 5. First administrator

On a trusted computer:

```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run admin:create
```

It asks for an email, name and password (hidden, at least 12 characters). No password is hardcoded or stored by the script. Turn on multi-factor authentication for the Supabase dashboard account itself.

## 6. Before launch

Work through this list in order.

1. Replace every [placeholder] and publish each page. Publishing is blocked while placeholders remain.
2. Fill in Settings with real contact details only, and remove any social links that aren't real.
3. Run `npm run media:import-client-photos` to bring in the client photos from the current website, or upload your own. Then confirm permission on each item, add alt text, and publish it.
4. Have the privacy and terms drafts reviewed, edit them and publish.
5. Approve only genuine reviews, each with the client's permission.
6. Leave the statistics strip off unless the figures are verified.
7. Submit a test booking request and a test inquiry. Check that both appear in the admin and that the emails arrive, then delete them.
8. Run through `docs/TESTING.md` on the live infrastructure.
9. Confirm that backups are set up (`docs/OPERATIONS.md`).

Once the homepage is published, the development banner disappears.
