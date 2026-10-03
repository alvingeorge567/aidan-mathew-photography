import type { Field, Schema, Section, Values } from "./schema";

export const PAGE_KEYS = [
  "home", "about", "storytelling", "services", "portfolio", "films", "reviews", "booking", "contact", "privacy", "terms",
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export function isPageKey(v: string): v is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(v);
}

export const PAGE_TITLES: Record<PageKey, string> = {
  home: "Home", about: "About", storytelling: "Storytelling", services: "Services", portfolio: "Portfolio",
  films: "Films", reviews: "Reviews", booking: "Booking", contact: "Contact", privacy: "Privacy", terms: "Terms",
};

export const PAGE_PATHS: Record<PageKey, string> = {
  home: "/", about: "/about", storytelling: "/storytelling", services: "/services", portfolio: "/portfolio",
  films: "/films", reviews: "/reviews", booking: "/booking", contact: "/contact", privacy: "/privacy", terms: "/terms",
};

/** Pages that can be previewed as a draft before publishing. */
export const PREVIEWABLE_PAGES: PageKey[] = ["home", "about", "storytelling", "privacy", "terms"];

const seo: Section = {
  title: "Search and sharing",
  description: "Shown in search results and when the page is shared.",
  fields: [
    { name: "seo_title", label: "Page title", type: "text", maxLength: 70 },
    { name: "seo_description", label: "Description", type: "textarea", rows: 3, maxLength: 170 },
    { name: "seo_image_id", label: "Sharing image", type: "media", accept: "image" },
  ],
};

const nameList = (name: string, label: string, itemLabel: string): Field => ({
  name, label, type: "list", itemLabel, maxItems: 20, fields: [{ name: "name", label: "Name", type: "text", maxLength: 60 }],
});

const legal = (title: string): Schema => [
  {
    title: "Content",
    description: "Draft text for the owner's review. Have it checked by a qualified adviser before relying on it.",
    fields: [
      { name: "heading", label: "Heading", type: "text", required: true },
      { name: "updated", label: "Last updated", type: "date" },
      { name: "body", label: "Body", type: "textarea", rows: 24, help: "Separate paragraphs with a blank line. Start a line with ## for a subheading." },
    ],
  },
  { ...seo, fields: seo.fields.map((f) => (f.name === "seo_title" ? { ...f, placeholder: title } : f)) },
];

export const PAGE_SCHEMAS: Record<PageKey, Schema> = {
  home: [
    {
      title: "Hero",
      fields: [
        { name: "hero_mode", label: "Hero type", type: "select", options: [{ value: "image", label: "Photograph" }, { value: "video", label: "Looping video (10–15 s)" }] },
        { name: "hero_image_id", label: "Hero photograph", type: "media", accept: "image", help: "Also used as the fallback when video can't play." },
        { name: "hero_video_id", label: "Hero video", type: "media", accept: "video" },
        { name: "hero_poster_id", label: "Video poster image", type: "media", accept: "image", help: "Shown before the video loads, and instead of it for visitors who prefer reduced motion. Leave empty to use the video's own poster frame." },
        { name: "hero_focal_x", label: "Focal point — horizontal (0–100)", type: "number", min: 0, max: 100 },
        { name: "hero_focal_y", label: "Focal point — vertical (0–100)", type: "number", min: 0, max: 100 },
        { name: "hero_eyebrow", label: "Small line above title", type: "text" },
        { name: "hero_title_1", label: "Title, first line", type: "text", required: true },
        { name: "hero_title_2", label: "Title, second line", type: "text" },
        { name: "hero_subtitle", label: "Subtitle", type: "text" },
        { name: "hero_film_link", label: "“Watch Our Film” link", type: "url", help: "A film page such as /films/our-film. Leave empty to link to all films." },
      ],
    },
    {
      title: "Services preview",
      fields: [
        { name: "services_heading", label: "Heading", type: "text" },
        { name: "services_intro", label: "Introduction", type: "textarea", rows: 3 },
      ],
    },
    {
      title: "About preview",
      fields: [
        { name: "about_heading", label: "Heading", type: "text" },
        { name: "about_text", label: "Introduction", type: "textarea", rows: 5 },
        { name: "about_image_id", label: "Photograph", type: "media", accept: "image" },
        { name: "about_video_id", label: "“Watch My Story” video (optional)", type: "media", accept: "video" },
      ],
    },
    {
      title: "Featured films",
      description: "Films marked as featured appear here (up to three).",
      fields: [
        { name: "films_heading", label: "Heading", type: "text" },
        { name: "films_intro", label: "Introduction", type: "textarea", rows: 3 },
      ],
    },
    {
      title: "Statistics strip",
      description: "Hidden until you enable it. Only publish figures you can stand behind.",
      fields: [
        { name: "stats_enabled", label: "Show statistics", type: "boolean" },
        { name: "stats", label: "Figures", type: "list", itemLabel: "Figure", maxItems: 4, fields: [
          { name: "value", label: "Figure", type: "text", maxLength: 20 },
          { name: "label", label: "Label", type: "text", maxLength: 60 },
        ] },
      ],
    },
    {
      title: "Client reviews",
      fields: [
        { name: "reviews_heading", label: "Heading", type: "text" },
        { name: "reviews_background_id", label: "Background photograph", type: "media", accept: "image" },
      ],
    },
    {
      title: "Inquiry",
      fields: [
        { name: "inquiry_heading", label: "Heading", type: "text" },
        { name: "inquiry_text", label: "Text", type: "textarea", rows: 3 },
      ],
    },
    seo,
  ],
  about: [
    {
      title: "Introduction",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Founder introduction", type: "textarea", rows: 8 },
        { name: "founder_image_id", label: "Portrait", type: "media", accept: "image" },
        { name: "intro_video_id", label: "Short introduction video (optional)", type: "media", accept: "video" },
      ],
    },
    {
      title: "Philosophy",
      fields: [
        { name: "philosophy_heading", label: "Heading", type: "text" },
        { name: "philosophy_text", label: "Text", type: "textarea", rows: 8 },
      ],
    },
    {
      title: "Team",
      fields: [
        { name: "team", label: "Team members", type: "list", itemLabel: "Person", maxItems: 12, fields: [
          { name: "name", label: "Name", type: "text" },
          { name: "role", label: "Role", type: "text" },
          { name: "bio", label: "Short bio", type: "textarea", rows: 3 },
          { name: "image_id", label: "Photograph", type: "media", accept: "image" },
        ] },
      ],
    },
    {
      title: "Behind the scenes",
      fields: [
        { name: "bts", label: "Photographs", type: "list", itemLabel: "Photograph", maxItems: 12, fields: [
          { name: "image_id", label: "Photograph", type: "media", accept: "image" },
          { name: "caption", label: "Caption", type: "text" },
        ] },
      ],
    },
    seo,
  ],
  storytelling: [
    {
      title: "Introduction",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 5 },
        { name: "hero_image_id", label: "Opening photograph", type: "media", accept: "image" },
      ],
    },
    {
      title: "Approach",
      description: "Short editorial passages, each with an optional photograph or short film.",
      fields: [
        { name: "passages", label: "Passages", type: "list", itemLabel: "Passage", maxItems: 8, fields: [
          { name: "heading", label: "Heading", type: "text" },
          { name: "text", label: "Text", type: "textarea", rows: 4 },
          { name: "image_id", label: "Photograph", type: "media", accept: "image" },
          { name: "video_id", label: "Short film", type: "media", accept: "video" },
        ] },
      ],
    },
    {
      title: "Wedding stories",
      fields: [
        { name: "stories_heading", label: "Heading", type: "text" },
        nameList("categories", "Story categories", "Category"),
      ],
    },
    seo,
  ],
  services: [
    {
      title: "Page",
      description: "Individual services are edited under Services.",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 4 },
      ],
    },
    {
      title: "Frequently asked questions",
      description: "Include only policies you have confirmed.",
      fields: [
        { name: "faq_heading", label: "Heading", type: "text" },
        { name: "faq", label: "Questions", type: "list", itemLabel: "Question", maxItems: 30, fields: [
          { name: "question", label: "Question", type: "text" },
          { name: "answer", label: "Answer", type: "textarea", rows: 4 },
        ] },
      ],
    },
    seo,
  ],
  portfolio: [
    {
      title: "Page",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 3 },
        nameList("categories", "Photo categories", "Category"),
      ],
    },
    seo,
  ],
  films: [
    {
      title: "Page",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 3 },
        nameList("categories", "Film categories", "Category"),
      ],
    },
    seo,
  ],
  reviews: [
    {
      title: "Page",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 3 },
        { name: "submissions_enabled", label: "Let couples submit a review on this page", type: "boolean", help: "Submissions stay pending until you approve them." },
        { name: "submission_intro", label: "Text above the review form", type: "textarea", rows: 3 },
      ],
    },
    seo,
  ],
  booking: [
    {
      title: "Page",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 3 },
        nameList("event_types", "Event types", "Event type"),
        nameList("budget_ranges", "Budget ranges (optional question)", "Range"),
        nameList("referral_sources", "How did you hear about us — options", "Option"),
      ],
    },
    seo,
  ],
  contact: [
    {
      title: "Page",
      fields: [
        { name: "heading", label: "Heading", type: "text", required: true },
        { name: "intro", label: "Introduction", type: "textarea", rows: 3 },
        nameList("inquiry_types", "Inquiry types", "Type"),
      ],
    },
    seo,
  ],
  privacy: legal("Privacy"),
  terms: legal("Terms"),
};

const PRIVACY_DRAFT = `[DRAFT FOR OWNER REVIEW — not legal advice. Replace or confirm every section before publishing.]

## What we collect
When you send a booking request or a message, we collect the details you enter: your name, email address, optional phone number, event details and your message. We use them only to reply to you and to plan your event.

## How we store it
Your details are stored in our booking system and are visible only to studio staff. We do not sell your information.

## Email
We send you an acknowledgment when you contact us, and we reply from our studio address. [Name the email provider you use.]

## How long we keep it
[State your retention period — for example, requests that do not become bookings are deleted after a set time.]

## Your choices
You can ask us to correct or delete your details at any time by emailing [studio email].

## Photographs and films
We publish images and films only with permission. [Describe your publication-permission process.]`;

const TERMS_DRAFT = `[DRAFT FOR OWNER REVIEW — not legal advice. Replace or confirm every section before publishing.]

## Using this website
The photographs, films and text on this website belong to the studio or the couples who appear in them. Please do not copy or reuse them without written permission.

## Booking requests
Sending a booking request asks about availability. It does not reserve a date or create a contract. A booking is confirmed only when the studio accepts it in writing.

## Contact
Questions about these terms: [studio email].`;

export const PAGE_DEFAULTS: Record<PageKey, Values> = {
  home: {
    hero_mode: "image",
    hero_image_id: "", hero_video_id: "", hero_poster_id: "",
    hero_focal_x: 50, hero_focal_y: 50,
    hero_eyebrow: "TIMELESS STORIES",
    hero_title_1: "AIDAN MATHEW",
    hero_title_2: "PHOTOGRAPHY LLC",
    hero_subtitle: "Weddings · Events · Cinematography",
    hero_film_link: "",
    services_heading: "More Than Just Coverage",
    services_intro: "",
    about_heading: "The Story Behind the Lens",
    about_text: "[A short introduction to the studio, written by the owner.]",
    about_image_id: "", about_video_id: "",
    films_heading: "Real Stories. Real Emotions.",
    films_intro: "",
    stats_enabled: false, stats: [],
    reviews_heading: "Words from Our Couples",
    reviews_background_id: "",
    inquiry_heading: "Let’s Create Something Beautiful.",
    inquiry_text: "Tell us a little about your day and we’ll be in touch.",
  },
  about: {
    heading: "The Story Behind the Lens",
    intro: "[Founder introduction — supplied by the owner. Who you are, why you began, and what you love about weddings.]",
    founder_image_id: "", intro_video_id: "",
    philosophy_heading: "How We Work",
    philosophy_text: "[Studio philosophy — how you approach a wedding day and the couples you work with.]",
    team: [], bts: [],
  },
  storytelling: {
    heading: "Your Wedding Is More Than a Day. It Is a Story.",
    intro: "[An introduction to how the studio preserves emotion, relationships, family traditions and the atmosphere of the day.]",
    hero_image_id: "",
    passages: [
      { heading: "Emotion", text: "[How you capture genuine emotion.]", image_id: "", video_id: "" },
      { heading: "Family and tradition", text: "[How you document relationships and family traditions.]", image_id: "", video_id: "" },
      { heading: "Atmosphere", text: "[How you preserve the feel of the place and the day.]", image_id: "", video_id: "" },
    ],
    stories_heading: "Wedding Stories",
    categories: [],
  },
  services: {
    heading: "Photography and Film",
    intro: "[An introduction to the services the studio offers.]",
    faq_heading: "Questions Couples Ask",
    faq: [],
  },
  portfolio: { heading: "Portfolio", intro: "", categories: [{ name: "Ceremony" }, { name: "Portraits" }, { name: "Celebration" }, { name: "Details" }] },
  films: { heading: "Films", intro: "Short highlights from the weddings we have filmed.", categories: [{ name: "Weddings" }, { name: "Engagements" }, { name: "Events" }] },
  reviews: { heading: "Kind Words", intro: "", submissions_enabled: false, submission_intro: "We’d love to hear about your experience. Reviews are published only with your permission and after the studio has read them." },
  booking: {
    heading: "Let’s Begin Your Story.",
    intro: "Share a few details about your plans. We’ll reply personally.",
    event_types: [{ name: "Wedding" }, { name: "Engagement or pre-wedding" }, { name: "Event" }, { name: "Other" }],
    budget_ranges: [],
    referral_sources: [{ name: "Instagram" }, { name: "Friend or family" }, { name: "Venue or planner" }, { name: "Search engine" }, { name: "Other" }],
  },
  contact: {
    heading: "Tell Us About Your Story.",
    intro: "Questions, ideas or just hello — we read every message.",
    inquiry_types: [{ name: "General question" }, { name: "Wedding" }, { name: "Event" }, { name: "Collaboration" }],
  },
  privacy: { heading: "Privacy", updated: "", body: PRIVACY_DRAFT },
  terms: { heading: "Website Terms", updated: "", body: TERMS_DRAFT },
};

export function withPageDefaults(key: PageKey, data: Values | null | undefined): Values {
  return { ...PAGE_DEFAULTS[key], ...(data ?? {}) };
}
