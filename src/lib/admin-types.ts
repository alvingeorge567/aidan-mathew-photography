export type ActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  /** Set when an action needs explicit confirmation (e.g. media still in use). */
  needsConfirm?: boolean;
  references?: string[];
};

export type MediaOption = {
  id: string;
  title: string;
  type: "image" | "video";
  thumb: string | null;
  published: boolean;
  duration?: number | null;
};

export type Option = { value: string; label: string };
