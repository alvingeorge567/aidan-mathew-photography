import type { Field, Schema, Values } from "./schema";

export const ENTITY_TABLES = ["pages", "services", "films", "stories"] as const;
export type EntityTable = (typeof ENTITY_TABLES)[number];
export function isEntityTable(v: string): v is EntityTable {
  return (ENTITY_TABLES as readonly string[]).includes(v);
}

export const ENTITY_LABELS: Record<EntityTable, string> = { pages: "Page", services: "Service", films: "Film", stories: "Story" };

export const SERVICE_SCHEMA: Schema = [
  {
    title: "Service",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL name", type: "text", required: true, help: "Lowercase words joined by hyphens." },
      { name: "summary", label: "Card summary", type: "textarea", rows: 3, maxLength: 300 },
      { name: "card_image_id", label: "Card photograph", type: "media", accept: "image" },
      { name: "sort_order", label: "Order", type: "number", min: 0, max: 999 },
    ],
  },
  {
    title: "Details",
    fields: [
      { name: "experience", label: "The experience", type: "textarea", rows: 6 },
      { name: "deliverables", label: "What you receive", type: "list", itemLabel: "Item", maxItems: 20, fields: [{ name: "item", label: "Item", type: "text" }] },
      { name: "next_steps", label: "Next steps", type: "textarea", rows: 4 },
      { name: "detail_image_id", label: "Photograph", type: "media", accept: "image" },
    ],
  },
  {
    title: "Package and price",
    description: "Leave the price hidden until you have confirmed it.",
    fields: [
      { name: "package_name", label: "Package name", type: "text" },
      { name: "starting_price", label: "Starting price", type: "text", maxLength: 40, placeholder: "e.g. From $4,500" },
      { name: "show_price", label: "Show the starting price publicly", type: "boolean" },
    ],
  },
];

export const FILM_SCHEMA: Schema = [
  {
    title: "Film",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: [], dynamic: true },
      { name: "description", label: "Short description", type: "textarea", rows: 4, maxLength: 1000 },
      { name: "kind_label", label: "Label", type: "select", options: [{ value: "Highlight", label: "Highlight" }, { value: "Preview", label: "Preview" }, { value: "Teaser", label: "Teaser" }], help: "Uploaded clips are 10–15 seconds, so they are labelled as highlights or previews." },
    ],
  },
  {
    title: "Media",
    fields: [
      { name: "video_id", label: "Video (10–15 s)", type: "media", accept: "video", required: true },
      { name: "poster_id", label: "Poster image", type: "media", accept: "image", help: "Leave empty to use the video's own poster frame." },
      { name: "captions_text", label: "Captions or transcript", type: "textarea", rows: 4, help: "Add this if the clip contains meaningful speech or vows." },
    ],
  },
  {
    title: "Placement",
    fields: [
      { name: "featured", label: "Feature on the homepage", type: "boolean" },
      { name: "story_id", label: "Related wedding story", type: "select", options: [], dynamic: true },
      { name: "sort_order", label: "Order", type: "number", min: 0, max: 999 },
      { name: "external_url", label: "Full-length film link (optional)", type: "url", help: "YouTube or Vimeo only. Other links are ignored." },
    ],
  },
];

export const STORY_SCHEMA: Schema = [
  {
    title: "Story",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL name", type: "text", required: true },
      { name: "couple_names", label: "Couple display names", type: "text", help: "As the couple agreed to be named." },
      { name: "category", label: "Category", type: "select", options: [], dynamic: true },
      { name: "cover_id", label: "Cover photograph", type: "media", accept: "image", required: true },
      { name: "intro", label: "Introduction", type: "textarea", rows: 5 },
      { name: "sort_order", label: "Order", type: "number", min: 0, max: 999 },
    ],
  },
  {
    title: "Date and place",
    description: "Shown only when you choose to show them.",
    fields: [
      { name: "event_date", label: "Date", type: "date" },
      { name: "show_date", label: "Show the date", type: "boolean" },
      { name: "location", label: "Location", type: "text" },
      { name: "show_location", label: "Show the location", type: "boolean" },
    ],
  },
  {
    title: "Closing",
    fields: [
      { name: "closing_heading", label: "Closing heading", type: "text" },
      { name: "closing_text", label: "Closing invitation", type: "textarea", rows: 3 },
      { name: "seo_description", label: "Search description", type: "textarea", rows: 3, maxLength: 170 },
    ],
  },
];

export const BLOCK_TYPES = ["text", "image_full", "image_pair", "gallery", "video", "quote", "cta"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export type StoryBlock = { type: BlockType; data: Values };

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Text",
  image_full: "Full-width photograph",
  image_pair: "Two photographs",
  gallery: "Photo gallery",
  video: "Short video",
  quote: "Quotation",
  cta: "Call to action",
};

export const BLOCK_FIELDS: Record<BlockType, Field[]> = {
  text: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "body", label: "Text", type: "textarea", rows: 6 },
  ],
  image_full: [
    { name: "image_id", label: "Photograph", type: "media", accept: "image" },
    { name: "caption", label: "Caption", type: "text" },
  ],
  image_pair: [
    { name: "left_id", label: "Left photograph", type: "media", accept: "image" },
    { name: "right_id", label: "Right photograph", type: "media", accept: "image" },
    { name: "caption", label: "Caption", type: "text" },
  ],
  gallery: [
    { name: "images", label: "Photographs", type: "list", itemLabel: "Photograph", maxItems: 40, fields: [{ name: "image_id", label: "Photograph", type: "media", accept: "image" }] },
  ],
  video: [
    { name: "video_id", label: "Video", type: "media", accept: "video" },
    { name: "caption", label: "Caption", type: "text" },
  ],
  quote: [
    { name: "text", label: "Quotation", type: "textarea", rows: 3 },
    { name: "attribution", label: "Attribution", type: "text" },
    { name: "permission_confirmed", label: "The speaker approved publishing this quotation", type: "boolean", required: true },
  ],
  cta: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "text", label: "Text", type: "textarea", rows: 2 },
    { name: "button_label", label: "Button label", type: "text" },
  ],
};

export const SETTINGS_SCHEMA: Schema = [
  {
    title: "Brand",
    fields: [
      { name: "business_name", label: "Business name", type: "text", required: true },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "logo_id", label: "Logo", type: "media", accept: "image", help: "Leave empty to show the business name as text." },
    ],
  },
  {
    title: "Contact details",
    description: "Leave anything empty that you don't want shown.",
    fields: [
      { name: "email", label: "Public email", type: "email" },
      { name: "phone", label: "Phone", type: "text", maxLength: 40 },
      { name: "service_area", label: "Service area", type: "text", placeholder: "e.g. New England and destination weddings" },
    ],
  },
  {
    title: "Social links",
    description: "Icons appear only for links you fill in.",
    fields: [
      { name: "instagram", label: "Instagram", type: "url" },
      { name: "facebook", label: "Facebook", type: "url" },
      { name: "youtube", label: "YouTube", type: "url" },
      { name: "vimeo", label: "Vimeo", type: "url" },
      { name: "tiktok", label: "TikTok", type: "url" },
      { name: "pinterest", label: "Pinterest", type: "url" },
    ],
  },
  {
    title: "Navigation",
    description: "To put an item in a dropdown, enter the parent's label in “Group under”.",
    fields: [
      { name: "nav", label: "Menu items", type: "list", itemLabel: "Menu item", maxItems: 16, fields: [
        { name: "label", label: "Label", type: "text", maxLength: 40 },
        { name: "href", label: "Link", type: "url" },
        { name: "group", label: "Group under", type: "text", maxLength: 40 },
      ] },
      { name: "footer_text", label: "Footer text", type: "textarea", rows: 3 },
    ],
  },
  {
    title: "Bookings and notifications",
    fields: [
      { name: "booking_capacity_per_date", label: "Confirmed bookings allowed per date", type: "number", min: 1, max: 10 },
      { name: "notification_email", label: "Send new requests to", type: "email", help: "Private. Defaults to the public email." },
    ],
  },
  {
    title: "Search and sharing",
    fields: [
      { name: "default_title", label: "Default page title", type: "text", maxLength: 70 },
      { name: "default_description", label: "Default description", type: "textarea", rows: 3, maxLength: 170 },
      { name: "share_image_id", label: "Default sharing image", type: "media", accept: "image" },
    ],
  },
];

export type NavItem = { label: string; href: string; group: string };

export type Settings = {
  business_name: string;
  tagline: string;
  logo_id: string;
  email: string;
  phone: string;
  service_area: string;
  instagram: string;
  facebook: string;
  youtube: string;
  vimeo: string;
  tiktok: string;
  pinterest: string;
  nav: NavItem[];
  footer_text: string;
  booking_capacity_per_date: number;
  notification_email?: string;
  default_title: string;
  default_description: string;
  share_image_id: string;
};

export const SETTINGS_DEFAULTS: Settings = {
  business_name: "Aidan Mathew Photography LLC",
  tagline: "Weddings · Events · Cinematography",
  logo_id: "",
  email: "",
  phone: "",
  service_area: "",
  instagram: "", facebook: "", youtube: "", vimeo: "", tiktok: "", pinterest: "",
  nav: [
    { label: "Home", href: "/", group: "" },
    { label: "Our Story", href: "/about", group: "" },
    { label: "Services", href: "/services", group: "" },
    { label: "Portfolio", href: "/portfolio", group: "" },
    { label: "Photography", href: "/portfolio", group: "Portfolio" },
    { label: "Wedding Stories", href: "/storytelling", group: "Portfolio" },
    { label: "Films", href: "/films", group: "" },
    { label: "Reviews", href: "/reviews", group: "" },
    { label: "Contact", href: "/contact", group: "" },
  ],
  footer_text: "",
  booking_capacity_per_date: 1,
  default_title: "Aidan Mathew Photography LLC — Wedding Photography and Films",
  default_description: "Wedding photography and cinematography that tells the story of your day.",
  share_image_id: "",
};

export const SERVICE_DEFAULTS: Values = { title: "", slug: "", summary: "", sort_order: 0, deliverables: [], show_price: false };
export const FILM_DEFAULTS: Values = { title: "", slug: "", category: "", kind_label: "Highlight", featured: false, sort_order: 0 };
export const STORY_DEFAULTS: Values = { title: "", slug: "", show_date: false, show_location: false, closing_heading: "Let’s Begin Your Story.", sort_order: 0 };

export const ENTITY_SCHEMAS: Record<Exclude<EntityTable, "pages">, Schema> = {
  services: SERVICE_SCHEMA,
  films: FILM_SCHEMA,
  stories: STORY_SCHEMA,
};
export const ENTITY_DEFAULTS: Record<Exclude<EntityTable, "pages">, Values> = {
  services: SERVICE_DEFAULTS,
  films: FILM_DEFAULTS,
  stories: STORY_DEFAULTS,
};
