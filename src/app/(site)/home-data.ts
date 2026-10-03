import "server-only";
import type { Values } from "@/lib/content/schema";
import { collectMediaIds } from "@/lib/content/schema";
import { PAGE_SCHEMAS } from "@/lib/content/pages";
import { getFilms, getMedia, getPage, getReviews, getServices } from "@/lib/data/public";
import type { HomeFilm, HomeService } from "@/components/views/HomeView";
import type { CarouselReview } from "@/components/site/ReviewsCarousel";
import type { MediaMap } from "@/lib/media";
import { CLIENT_PHOTO_SLOTS, clientPhotoId, clientPhotoMedia } from "@/lib/client-photos";

const DEMO_SERVICES: HomeService[] = [
  "Wedding Cinematography",
  "Wedding Photography",
  "Engagement and Pre-Wedding",
  "Event Photography and Video",
  "Livestreaming",
].map((title) => {
  const slug = title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const photo = CLIENT_PHOTO_SLOTS.services[slug];
  return { title, slug, summary: "", imageId: photo ? clientPhotoId(photo) : "", demo: true };
});

/** Loads everything the homepage needs. `extraMedia` lets previews supply draft media. */
export async function loadHomeData(content: Values, demo: boolean, extraMedia: MediaMap = {}) {
  const [services, films, reviews, contact] = await Promise.all([
    getServices(),
    getFilms({ featuredOnly: true }),
    getReviews({ featuredFirst: true, limit: 8 }),
    getPage("contact"),
  ]);

  const homeServices: HomeService[] = services.map((s) => ({
    slug: String(s.content.slug ?? ""),
    title: String(s.content.title ?? ""),
    summary: String(s.content.summary ?? ""),
    imageId: String(s.content.card_image_id ?? ""),
  }));
  const homeFilms: HomeFilm[] = films.map((f) => ({
    slug: String(f.content.slug ?? ""),
    title: String(f.content.title ?? ""),
    category: String(f.content.category ?? ""),
    kindLabel: String(f.content.kind_label ?? "Highlight"),
    posterId: String(f.content.poster_id ?? ""),
    videoId: String(f.content.video_id ?? ""),
  }));
  const carousel: CarouselReview[] = reviews.map((r) => ({
    id: r.id, name: r.display_name, text: r.review_text, rating: r.rating, eventType: r.event_type,
  }));

  const ids = [
    ...collectMediaIds(PAGE_SCHEMAS.home, content),
    ...homeServices.map((s) => s.imageId),
    ...homeFilms.flatMap((f) => [f.posterId, f.videoId]),
  ];
  // In the development preview, client photos from the current site stand in for empty slots.
  const media = { ...(demo ? clientPhotoMedia() : {}), ...(await getMedia(ids)), ...extraMedia };
  const inquiryTypes = ((contact.content.inquiry_types as { name?: string }[]) ?? []).map((t) => t.name ?? "").filter(Boolean);

  return {
    services: homeServices.length ? homeServices : demo ? DEMO_SERVICES : [],
    films: homeFilms,
    reviews: carousel,
    demoFilmPosterIds: demo ? CLIENT_PHOTO_SLOTS.filmPosters.map(clientPhotoId) : [],
    media,
    inquiryTypes,
  };
}
