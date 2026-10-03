"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import type { ActionResult, Option } from "@/lib/admin-types";
import { deleteMedia, publishMedia, retryProcessing, unpublishMedia, updateMedia } from "@/app/admin/actions/media";
import { MediaUploader } from "./MediaUploader";

export type EditableMedia = {
  id: string;
  media_type: "image" | "video";
  title: string;
  alt_text: string;
  caption: string;
  category: string;
  focal_x: number;
  focal_y: number;
  story_id: string;
  permission_confirmed: boolean;
  permission_notes: string;
  processing_status: string;
  publication_status: string;
  has_unpublished_changes: boolean;
  in_portfolio: boolean;
  portfolio_order: number;
};

type Props = {
  media: EditableMedia;
  previewImage: string | null;
  previewVideo: string | null;
  categories: string[];
  stories: Option[];
};

export function MediaEditor({ media, previewImage, previewVideo, categories, stories }: Props) {
  const router = useRouter();
  const [v, setV] = useState(media);
  const [saved, setSaved] = useState(JSON.stringify(media));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [showReplace, setShowReplace] = useState(false);
  const dirty = useMemo(() => JSON.stringify(v) !== saved, [v, saved]);
  const ready = media.processing_status === "ready";
  const published = media.publication_status === "published";

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof EditableMedia>(k: K, val: EditableMedia[K]) => setV((p) => ({ ...p, [k]: val }));

  const run = (fn: (confirmed: boolean) => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      let r = await fn(false);
      if (!r.ok && r.needsConfirm) {
        const proceed = window.confirm(`${r.error}\n\n• ${(r.references ?? []).join("\n• ")}\n\nContinue?`);
        if (!proceed) return setResult({ ok: false, error: "Nothing was changed." });
        r = await fn(true);
      }
      setResult(r);
      if (r.ok) {
        onOk?.();
        router.refresh();
      }
    });

  const save = () => run(() => updateMedia(media.id, v as unknown as Record<string, unknown>), () => setSaved(JSON.stringify(v)));

  const pickFocal = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    set("focal_x", Math.round(((e.clientX - rect.left) / rect.width) * 100));
    set("focal_y", Math.round(((e.clientY - rect.top) / rect.height) * 100));
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="a-card overflow-hidden">
          {media.media_type === "video" && previewVideo ? (
            <video src={previewVideo} poster={previewImage ?? undefined} controls playsInline className="max-h-[70vh] w-full bg-ink object-contain" />
          ) : previewImage ? (
            <button type="button" onClick={pickFocal} className="relative block w-full cursor-crosshair" aria-label="Set the focal point by clicking the image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt={v.alt_text} className="block w-full" />
              <span
                className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
                style={{ left: `${v.focal_x}%`, top: `${v.focal_y}%` }}
                aria-hidden="true"
              />
            </button>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-stone text-sm text-body/70">Preview available once processing finishes.</div>
          )}
        </div>
        {media.media_type === "image" && previewImage ? (
          <p className="a-help">Click the photo to set the focal point used when it is cropped into cards and banners. The full photo is always shown in galleries.</p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-sm">
          <label className="a-label">
            Focal point horizontal
            <input type="number" min={0} max={100} className="a-input" value={v.focal_x} onChange={(e) => set("focal_x", Number(e.target.value))} />
          </label>
          <label className="a-label">
            Focal point vertical
            <input type="number" min={0} max={100} className="a-input" value={v.focal_y} onChange={(e) => set("focal_y", Number(e.target.value))} />
          </label>
        </div>

        <div className="mt-8">
          {showReplace ? (
            <MediaUploader replaceAssetId={media.id} replaceKind={media.media_type} onDone={() => setShowReplace(false)} />
          ) : (
            <button type="button" className="a-btn" onClick={() => setShowReplace(true)}>
              Replace file
            </button>
          )}
          <p className="a-help">
            The current version stays live while a replacement is processed. When it is ready, publish again to update the live site.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="a-card space-y-4 p-5">
          <label className="a-label">
            Title
            <input className="a-input" value={v.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="a-label">
            Alt text {media.media_type === "image" ? <span className="text-[#9b2c1f]">*</span> : null}
            <textarea className="a-input" rows={2} value={v.alt_text} onChange={(e) => set("alt_text", e.target.value)} aria-describedby="alt-help" />
          </label>
          <p id="alt-help" className="a-help !mt-1">Describe what the photo shows for people using screen readers. Required to publish photos.</p>
          <label className="a-label">
            Caption
            <input className="a-input" value={v.caption} onChange={(e) => set("caption", e.target.value)} />
          </label>
          <label className="a-label">
            Category
            <input className="a-input" list="media-categories" value={v.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="media-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="a-label">
            Related wedding story
            <select className="a-input" value={v.story_id} onChange={(e) => set("story_id", e.target.value)}>
              <option value="">— None —</option>
              {stories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          {media.media_type === "image" ? (
            <div className="rounded-sm border border-stone p-3">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input type="checkbox" className="h-5 w-5 accent-body" checked={v.in_portfolio} onChange={(e) => set("in_portfolio", e.target.checked)} />
                Show in the portfolio
              </label>
              {v.in_portfolio ? (
                <label className="a-label mt-3">
                  Portfolio order
                  <input type="number" className="a-input max-w-[8rem]" value={v.portfolio_order} onChange={(e) => set("portfolio_order", Number(e.target.value))} />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="a-card space-y-3 p-5">
          <h2 className="font-medium">Publication permission</h2>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-body" checked={v.permission_confirmed} onChange={(e) => set("permission_confirmed", e.target.checked)} />
            I confirm the studio owns or is licensed to use this media, and the people shown agreed to its publication.
          </label>
          <label className="a-label">
            Permission notes and restrictions
            <textarea className="a-input" rows={3} value={v.permission_notes} onChange={(e) => set("permission_notes", e.target.value)} placeholder="e.g. Couple approved by email on 4 May; no use in paid ads." />
          </label>
        </div>

        <div className="a-card flex flex-wrap gap-2 p-5">
          <button type="button" className="a-btn-primary" onClick={save} disabled={pending || !dirty}>
            {dirty ? "Save changes" : "Saved"}
          </button>
          {ready ? (
            <button
              type="button"
              className="a-btn"
              disabled={pending || dirty}
              title={dirty ? "Save your changes first" : undefined}
              onClick={() => run(() => publishMedia(media.id))}
            >
              {published ? (media.has_unpublished_changes ? "Publish new version" : "Republish") : "Publish"}
            </button>
          ) : null}
          {published ? (
            <button type="button" className="a-btn" disabled={pending} onClick={() => run((c) => unpublishMedia(media.id, c))}>
              Unpublish
            </button>
          ) : null}
          {media.processing_status === "failed" ? (
            <button type="button" className="a-btn" disabled={pending} onClick={() => run(() => retryProcessing(media.id))}>
              Retry processing
            </button>
          ) : null}
          <button
            type="button"
            className="a-btn-danger"
            disabled={pending}
            onClick={() =>
              window.confirm("Delete this media and all its files permanently?") &&
              run((c) => deleteMedia(media.id, c), () => router.push("/admin/media"))
            }
          >
            Delete
          </button>
          <p role="status" aria-live="polite" className={`w-full text-sm ${result && !result.ok ? "text-[#9b2c1f]" : "text-body/75"}`}>
            {dirty ? "Unsaved changes" : result ? (result.ok ? result.message : result.error) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
