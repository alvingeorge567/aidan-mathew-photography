# Aidan Mathew Photography — website and studio admin

A wedding photography and videography website with a private admin area. Visitors browse photographs, films, wedding stories and reviews, and send inquiries or booking requests without an account. The studio owner signs in to upload photos and 10–15 second videos, edit every page, moderate reviews and manage booking requests — without touching code.

The business name, logo, contact details and navigation are all editable under **Admin → Settings**.

## What's inside

| Part | Technology | Where |
|---|---|---|
| Website and admin | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS | `src/` |
| Database, auth, storage | Supabase (PostgreSQL, Supabase Auth, Supabase Storage) | `supabase/` |
| Media worker | Node.js, FFmpeg/ffprobe, sharp | `worker/` |
| Shared rules | Duration limits, booking workflow, embed allowlist | `shared/` |
| Tests | Vitest unit tests, SQL behaviour tests, worker self-test | `tests/`, `supabase/tests/`, `worker/scripts/` |
| Documentation | Admin guide, deployment, operations, security, testing | `docs/` |

## Quick start (local)

Requirements: Node.js 20.9+, a Supabase project (free tier works for trying it out — see the upload-size note in `docs/DEPLOYMENT.md`), and FFmpeg for the worker.

```bash
npm ci
cp .env.example .env.local            # fill in your Supabase URL and keys
# Apply the database: paste each file in supabase/migrations/ (in order) into the
# Supabase SQL editor, then supabase/seed.sql — or use `supabase db push`.
npm run admin:create                   # create the first administrator
npm run dev                            # http://localhost:3000 and /admin

# In a second terminal, the media and email worker:
cd worker && npm ci && npm start       # needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

Without Supabase settings the site still runs, showing labelled placeholder content and a development banner; forms say plainly that nothing can be sent.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build and run the website |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (47 tests) |
| `npm run admin:create` | Create an administrator (prompts for details; no public sign-up exists) |
| `npm run media:import-client-photos` | Copy the client photos from the current website into the private media library |
| `DATABASE_URL=… scripts/test-db.sh` | Run migrations and security/booking tests against an empty local PostgreSQL |
| `cd worker && npm run selftest` | Generate test clips and run the real validation and processing code |

## Key behaviour

- **Drafts never leak.** Pages, services, films and stories are edited as drafts. The live site keeps showing the last published version until you press Publish.
- **Uploads stay private.** Files go straight from the browser to private storage with resumable uploads. The worker checks the real file type and video length, then creates web versions. Only Ready media can be published, and publishing copies only optimized versions — never originals — to the public bucket.
- **Requests are not bookings.** The booking form and acknowledgment email say so. Confirming a booking checks blocked dates and per-date capacity inside a database lock, so two confirmations can't overbook a date.
- **Nothing is invented.** No sample reviews, statistics, biography or address are published. Placeholder text sits in [square brackets], and publishing is blocked until it is replaced.

## Documentation

- `docs/ADMIN_GUIDE.md` — for the studio owner: signing in, uploading, publishing, reviews, bookings
- `docs/DEPLOYMENT.md` — Supabase setup, hosting the website and worker, email, first admin
- `docs/OPERATIONS.md` — backups and restoring, retention and deletion, caching, storage and costs
- `docs/SECURITY.md` — how access control works and what to keep secret
- `docs/TESTING.md` — what has been tested, how, and what still needs testing on real infrastructure
- `docs/IMPLEMENTATION_STATUS.md` — implemented features versus integrations that need your accounts

## Client photographs from the current website

The development preview shows seven client photographs from aidanmphotography.com/clients.html (loaded from that site) wherever a photo hasn't been chosen yet. `shared/client-photos.json` lists them and says which photo goes where.

To bring them into the site properly, run `npm run media:import-client-photos` with the worker running. The script copies them into the private media library and fills the matching photo slots in page and service drafts. Nothing is published until you confirm permission, add alt text and publish each photo.

The images on the current site are web-sized copies. For the best quality on large screens, replace them with full-resolution originals from your archive (Media → open the photo → Replace file).

## Content and licensing

The reference design guided the layout only. Use photographs, films and music the studio owns or has licensed, and record permission for each item in the media library before publishing it. The privacy and terms pages are drafts for the owner's review, not legal advice.
