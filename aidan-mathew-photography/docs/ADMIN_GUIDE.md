# Studio admin guide

This guide is for whoever runs the studio's website day to day. You don't need any technical knowledge.

## Signing in

Go to **yourwebsite.com/admin** and sign in with the email and password set up for you. There is no public sign-up. To add another administrator, ask whoever set up the site to run the *create admin* step (`npm run admin:create`).

If you see "This account doesn't have admin access", the account exists but hasn't been made an administrator.

## How publishing works

Everything you edit is saved as a **draft** first. Visitors keep seeing the last **published** version until you press **Publish**.

| You see | It means |
|---|---|
| Draft | Never published. Visitors can't see it. |
| Published | Live on the website. |
| Published · unpublished changes | Live, but you've saved edits that aren't live yet. Press Publish to update the site. |
| Archived | Removed from the site but kept in the admin. |

**Preview draft** shows exactly how a page, story or film will look, using your saved draft. Only you can see previews. Save your draft before previewing or publishing; the buttons wait until you have.

If you try to leave a page with unsaved changes, your browser will warn you.

### Placeholders

Text in [square brackets] is a placeholder, for example *[Founder introduction — supplied by the owner]*. The site won't let you publish a page while placeholders remain, so nothing unfinished goes live by accident. Until the homepage is published, visitors see a "development preview" banner.

## Photos and videos (Media)

### Uploading

1. Open **Media** and drag files onto the upload area, or choose **Choose files**.
2. Photos: JPEG, PNG or WebP. Videos: MP4, MOV or WebM, **between 10 and 15 seconds**.
3. Each file shows its progress. You can **Pause**, **Retry** or **Cancel**. If your connection drops, choose Retry — the upload continues from where it stopped.

A video shorter than 10 seconds or longer than 15 seconds is refused with "Please upload a video between 10 and 15 seconds long." The website checks this in your browser and then again on the server, which is the check that counts.

### Processing

After uploading, each file moves through **Validating** → **Processing** → **Ready**. The media page refreshes by itself. Photos usually take seconds; videos can take a minute or two. If something fails, open the item to see why, and choose **Retry processing** or upload a corrected file.

### Before you publish a photo or video

Open the item and fill in:

- **Title** — for your own reference.
- **Alt text** — a short description of the photo for people using screen readers (required for photos).
- **Caption**, **category** and **related wedding story** — optional.
- **Focal point** — click the important part of the photo (usually faces). Cropped cards and banners keep that point in view. Galleries always show the full photo.
- **Show in the portfolio** — tick to include it on the Portfolio page.
- **Publication permission** — tick to confirm the studio may publish it, and note any restrictions (e.g. "no paid advertising").

Then press **Publish**. Uploading alone never makes anything public.

### Photos imported from the old website

If the client photographs from the previous website were imported, they appear in Media with a note saying where they came from. Before publishing each one:

1. Confirm the client is happy for it to appear on the new site, and tick the permission box.
2. Add alt text describing the photo.
3. Optionally choose **Replace file** to upload the full-resolution original; the old site only had web-sized copies.

Baptism and family photos often show children, so check with the parents first.

### Replacing, unpublishing and deleting

- **Replace file** uploads a new version. The old one stays live until the new one is Ready and you publish again.
- **Unpublish** removes the public copies. If the item is used on a page, you'll see where first.
- **Delete** removes the item and all its files permanently, after a warning listing where it's used.

People who already downloaded or saved a public image can't be made to delete it. Unpublished files may also remain in browser or network caches for up to an hour.

## Pages

**Pages** lists every page on the site. Open one to edit its text, photos and search settings (the title and description Google shows). Use the **Media** fields to choose from your Ready photos and videos — anything marked "not published" must be published in Media first.

On the **Home** page you can:

- switch the opening section between a photograph and a looping 10–15 second video;
- choose a poster image, which is shown before the video loads and to visitors who prefer reduced motion;
- set the focal point and edit all the headline text and buttons.

The **statistics strip** stays hidden until you switch it on. Only add figures you can stand behind.

Categories for the portfolio, films and stories are edited on the **Portfolio**, **Films** and **Storytelling** pages.

## Services

Each service has a title, card photograph, description, a "what you receive" list, next steps, and optional package name and starting price. The price only appears if you tick **Show the starting price publicly**. Every service links to the booking form with that service already chosen. Leave any service you don't offer unpublished.

## Films

1. Upload and publish the video in **Media** first.
2. In **Films**, choose **New film**, add a title and choose the video.
3. Optionally choose a poster image, a category, a related wedding story, and a full-length film link. Full-length links must be YouTube or Vimeo; other links are ignored.
4. Tick **Feature on the homepage** for up to three films.

Uploaded clips are labelled as highlights or previews, not as full wedding films. If a clip has meaningful speech, such as vows, add a transcript.

## Wedding stories

A story has a cover photograph, an introduction and **sections** you add in any order:

- Text
- Full-width photograph
- Two photographs
- Photo gallery
- Short video
- Quotation
- Call to action

Use the arrows to reorder sections. Quotations only appear if you tick that the speaker approved publishing them. The date and location appear only if you choose to show them. Share only what the couple has agreed to.

## Reviews

New reviews from the website arrive as **pending** and never appear until you approve them.

- **Approve** to publish.
- **Feature on homepage** to show it in the homepage carousel.
- **Hide** to take it down.
- **Reject** to decline it.

A client's words can't be edited. If something needs changing, hide the review and ask the client for a new one. To add a review you received by email, use **Add a review you received**, type it exactly as written and confirm the client's permission.

To let couples submit reviews on the site, switch it on under **Pages → Reviews**.

## Booking requests

Requests from the booking form appear under **Bookings** with a reference number (e.g. BR-3F9A21C0). A request never reserves a date by itself.

Move a request through the stages with the buttons on its page:

**New → Contacted → Proposal sent → Confirmed** (or **Declined** / **Cancelled** at any point)

When you confirm, the site checks:

- that the date isn't blocked;
- that the date hasn't reached its limit (one confirmed booking per date unless you change it in Settings).

Two people confirming at the same moment can't double-book a date.

Use **Private notes** for anything you want to remember; clients never see them. Under **Unavailable dates**, block days you can't work. Visitors choosing a blocked date are told it's unavailable, and they can still ask about alternatives.

## Inquiries

Messages from the contact form and homepage appear under **Inquiries**. Mark them **In progress**, **Closed** or **Spam**, and add private notes.

## Emails

When email is set up, the client receives an acknowledgment and the studio receives a notification for each request and inquiry. Each request shows whether its emails were sent. If one failed, fix the cause (often the notification address under Settings) and choose **Retry**. Requests are always saved, even when email fails.

## Settings

Here you edit:

- the business name, logo and tagline;
- the public email, phone and service area;
- social links (icons appear only for links you fill in);
- the menu, the footer text and the default search settings;
- **Send new requests to**, the private address for notifications;
- **Confirmed bookings allowed per date**.

Settings take effect on the live site as soon as you save.
