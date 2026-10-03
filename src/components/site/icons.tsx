type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const PlayIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" /></svg>
);
export const PauseIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
);
export const ChevronLeft = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
export const ChevronRight = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M9 5l7 7-7 7" /></svg>
);
export const ChevronDown = ({ className = "h-3.5 w-3.5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M5 9l7 7 7-7" /></svg>
);
export const MenuIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M3 7h18M3 12h18M3 17h18" /></svg>
);
export const CloseIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M5 5l14 14M19 5L5 19" /></svg>
);

const social: Record<string, string> = {
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5h.01",
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z",
  youtube: "M22 12s0-3.5-.45-5.1a2.6 2.6 0 0 0-1.8-1.8C18.15 4.6 12 4.6 12 4.6s-6.15 0-7.75.5a2.6 2.6 0 0 0-1.8 1.8C2 8.5 2 12 2 12s0 3.5.45 5.1a2.6 2.6 0 0 0 1.8 1.8c1.6.5 7.75.5 7.75.5s6.15 0 7.75-.5a2.6 2.6 0 0 0 1.8-1.8C22 15.5 22 12 22 12ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z",
  vimeo: "M3 8.5 4 9.8s2-1.6 2.7-.8c.7.8 3.3 10.5 4.2 11.3.9.8 3.6-.6 6.3-4.3 2.7-3.7 2.8-6.6 2.8-6.6s.2-3.9-3.6-3.4c-1.9.3-3.3 2.5-3.6 3.9 1.5-1.1 2.8-.5 2 1.4-.8 1.9-2.3 3.6-2.8 3.6-.5 0-1-1.4-1.6-3.9-.6-2.6-.6-7.1-3.3-6.6C6.7 4.9 3 8.5 3 8.5Z",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3-3.46V7.5a7 7 0 1 0 7 7V9.3a7.9 7.9 0 0 0 3 1.2V7a4.5 4.5 0 0 1-4-4h-3Z",
  pinterest: "M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.3-4.5-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4l.1.4-.3 1.1c0 .2-.2.3-.4.2-1.4-.7-2.2-2.7-2.2-4.3 0-3.5 2.6-6.8 7.4-6.8 3.9 0 6.9 2.8 6.9 6.5 0 3.9-2.4 7-5.8 7-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.3-1.4 3.1A10 10 0 1 0 12 2Z",
};

export function SocialIcon({ name, className = "h-5 w-5" }: { name: keyof typeof social | string; className?: string }) {
  const d = social[name];
  if (!d) return null;
  const filled = name !== "instagram";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...(filled ? { fill: "currentColor" } : base)}>
      <path d={d} />
    </svg>
  );
}

export const SOCIAL_KEYS = ["instagram", "facebook", "youtube", "vimeo", "tiktok", "pinterest"] as const;
export const SOCIAL_LABELS: Record<(typeof SOCIAL_KEYS)[number], string> = {
  instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", vimeo: "Vimeo", tiktok: "TikTok", pinterest: "Pinterest",
};
