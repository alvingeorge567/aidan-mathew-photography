# Implementation status

## Implemented and working in code

- All public routes from the brief, plus sitemap, robots, 404 pages and draft previews (home, about, storytelling, privacy, terms, stories, films).
- All admin routes from the brief, with real authentication and server-side authorization on every page and action.
- Draft and publish workflow with revision snapshots, unsaved-change warnings and confirmation before destructive actions.
- Placeholder detection that blocks publishing, and a development banner until the homepage is published.
- Media library:
  - drag-and-drop, resumable direct-to-storage uploads with progress, pause, retry and cancel;
  - filters, search and pagination;
  - focal-point picker, permission records, portfolio placement, replace, unpublish and delete with reference warnings.
- Trusted validation and processing worker: magic-byte type detection, ffprobe duration check, H.264/AAC renditions, posters, WebP image sizes, retries with backoff, abandoned-upload clean-up.
- Story builder with seven section types, reordering and quotation-permission checks.
- Films with categories, featured flag, related story, transcript text, and allowlisted YouTube/Vimeo full-length links that load only on click.
- Services with deliverables, optional hidden pricing, an FAQ, and a preselected service on the booking form.
- Reviews: optional public submission, pending by default, approve/reject/feature/hide, immutable text, studio-entered reviews with permission.
- Bookings:
  - three-step form with an availability hint, duplicate protection and reference numbers;
  - the full status workflow, private notes, blocked dates, and transactional capacity checks.
- Inquiries with statuses, notes and email status, with retry.
- Email queue with acknowledgments and studio notifications. Nothing is lost if email isn't configured.
- Audit log of publishing, media, booking and review actions.
- SEO: editable titles, descriptions and sharing images; canonical URLs; JSON-LD only from owner-entered facts and real film data.

- Client photographs from the current website: shown in the development preview, with a script that imports them into the media library and fills the matching draft photo slots.

## Needs your accounts or configuration (not faked)

| Integration | Until configured |
|---|---|
| Supabase project | Site shows labelled placeholder content; forms say nothing can be sent; admin sign-in explains what's missing |
| `SUPABASE_SERVICE_ROLE_KEY` on the website | Forms can't save; Publish and Delete in Media show an error naming the variable |
| Worker host with FFmpeg | Uploads stay at "Validating" |
| Resend (or another provider) | Emails stay queued as pending and show "Email is not configured" |
| Paid Supabase plan or a lower limit | Uploads over 50 MB fail on the Free plan |
| Domain and hosting | Not purchased or published by this project |

## Deliberately out of scope (architecture leaves room)

- Private client-delivery galleries. A future `client_galleries` table and private bucket fit the existing media model.
- Payments and electronic contracts. Booking requests have a stable reference and status to attach these to.
- CAPTCHA. The form actions have a single place to add a check.

## Known limitations

- Only the seven client photos whose addresses appear in the clients page HTML are included. The 22 gallery thumbnails on that page load their images with scripts, so their addresses couldn't be read. Add more by uploading in Media, or by adding entries to `shared/client-photos.json` before importing.
- The development preview loads those photos directly from aidanmphotography.com. If that site goes offline, the preview falls back to placeholders. Imported photos are served from your own storage.

- Settings (business name, contact details, navigation) take effect when saved; they have no draft stage. The same applies to media details such as alt text and captions on already-published media.
- Preview is available for the home, about, storytelling and legal pages, stories and films. Other pages (services, portfolio, films list, reviews, booking, contact) are previewed by publishing.
- Captions are a transcript text field shown below a film. WebVTT caption tracks aren't generated.
- The design hasn't been reviewed against the reference image (none was supplied) or audited for accessibility with assistive technology. See `TESTING.md`.
