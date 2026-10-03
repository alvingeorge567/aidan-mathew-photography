import type { Values } from "@/lib/content/schema";
import type { MediaMap, ResolvedMedia } from "@/lib/media";

/**
 * Client photographs from the studio's current site (aidanmphotography.com/clients.html).
 *
 * They are used in two ways:
 *  1. Development preview: while the homepage is unpublished, empty photo slots show these
 *     images (loaded from the current site) instead of grey placeholders.
 *  2. Import: `npm run media:import-client-photos` copies them into the studio's own private
 *     media library, where the owner confirms permission, adds alt text and publishes them.
 *
 * Change which photo fills which slot in shared/client-photos.json.
 */
import manifest from "@shared/client-photos.json";

export type ClientPhoto = { key: string; url: string; title: string; gallery: string };

export const CLIENT_PHOTOS: ClientPhoto[] = manifest.photos;

/** Which photo fills which slot (edit shared/client-photos.json). */
export const CLIENT_PHOTO_SLOTS: {
  home: Record<string, string>;
  services: Record<string, string>;
  filmPosters: string[];
  storytelling: { hero_image_id: string; passages: string[] };
} = manifest.slots;

const PREFIX = "client-photo:";
export const clientPhotoId = (key: string) => `${PREFIX}${key}`;

const ALT = "Client photograph by Aidan Mathew Photography";

function toMedia(p: ClientPhoto): ResolvedMedia {
  return {
    id: clientPhotoId(p.key),
    type: "image",
    title: p.title,
    alt: ALT,
    caption: "",
    category: "",
    // Real dimensions aren't known until import; layouts size these boxes with CSS.
    width: 1600,
    height: 1067,
    duration: null,
    focalX: 50,
    focalY: 40,
    images: [{ url: p.url, w: 1600, h: 1067 }],
    videos: [],
  };
}

export function clientPhotoMedia(): MediaMap {
  return Object.fromEntries(CLIENT_PHOTOS.map((p) => [clientPhotoId(p.key), toMedia(p)]));
}

export function clientPhotoList(): ResolvedMedia[] {
  return CLIENT_PHOTOS.map(toMedia);
}

/** Fills empty fields only; anything the owner has set is left alone. */
export function fillEmpty(content: Values, slots: Record<string, string>): Values {
  const out = { ...content };
  for (const [field, key] of Object.entries(slots)) if (!out[field]) out[field] = clientPhotoId(key);
  return out;
}

export function fillStorytelling(content: Values): Values {
  const out = fillEmpty(content, { hero_image_id: CLIENT_PHOTO_SLOTS.storytelling.hero_image_id });
  const passages = Array.isArray(out.passages) ? (out.passages as Values[]) : [];
  out.passages = passages.map((p, i) => {
    const key = CLIENT_PHOTO_SLOTS.storytelling.passages[i];
    return key && !p.image_id && !p.video_id ? { ...p, image_id: clientPhotoId(key) } : p;
  });
  return out;
}
