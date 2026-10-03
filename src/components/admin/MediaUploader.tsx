"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type DragEvent } from "react";
import * as tus from "tus-js-client";
import { browserClient } from "@/lib/supabase/browser";
import { cancelUpload, completeUpload, createUpload } from "@/app/admin/actions/media";
import { DURATION_ERROR, MEDIA_RULES, classifyUpload, formatBytes, isDurationAllowed, precheckFile } from "@shared/media-rules";

type Status = "checking" | "rejected" | "uploading" | "paused" | "finishing" | "error" | "done" | "cancelled";
type Item = {
  key: string;
  file: File;
  status: Status;
  progress: number;
  message?: string;
  assetId?: string;
  objectName?: string;
};

const ENDPOINT = `${(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_UPLOAD_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`).replace(/\/$/, "")}/upload/resumable`;

/** Reads a video's duration in the browser for instant feedback. Returns null if the browser can't decode it. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    const timer = setTimeout(() => done(null), 8000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    v.src = url;
  });
}

export function MediaUploader({ replaceAssetId, replaceKind, onDone }: { replaceAssetId?: string; replaceKind?: "image" | "video"; onDone?: () => void }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const uploads = useRef(new Map<string, tus.Upload>());
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i))), []);

  const startTus = useCallback(
    async (item: Item, ticket: { assetId: string; bucket: string; objectName: string; contentType: string }) => {
      const { data } = await browserClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        patch(item.key, { status: "error", message: "Your session expired. Sign in again, then retry." });
        return;
      }
      const upload = new tus.Upload(item.file, {
        endpoint: ENDPOINT,
        retryDelays: [0, 2000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${token}`, "x-upsert": "false" },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024, // Supabase requires 6 MB chunks for resumable uploads.
        metadata: { bucketName: ticket.bucket, objectName: ticket.objectName, contentType: ticket.contentType, cacheControl: "3600" },
        onProgress: (sent, total) => patch(item.key, { progress: total ? Math.round((sent / total) * 100) : 0 }),
        onError: (err) => {
          const msg = String(err?.message ?? err);
          patch(item.key, {
            status: "error",
            message: /413|too large|Payload/i.test(msg)
              ? "Storage rejected the file as too large. Check the bucket and plan upload limits."
              : "The upload was interrupted. Retry to continue from where it stopped.",
          });
        },
        onSuccess: async () => {
          patch(item.key, { status: "finishing", progress: 100 });
          const res = await completeUpload({ assetId: ticket.assetId, objectName: ticket.objectName, replace: Boolean(replaceAssetId) });
          if (res.ok) {
            patch(item.key, { status: "done", message: "Uploaded. Validating and processing — this page updates automatically." });
            uploads.current.delete(item.key);
            router.refresh();
            onDone?.();
          } else {
            patch(item.key, { status: "error", message: res.error });
          }
        },
      });
      uploads.current.set(item.key, upload);
      const previous = await upload.findPreviousUploads();
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      patch(item.key, { status: "uploading", assetId: ticket.assetId, objectName: ticket.objectName });
      upload.start();
    },
    [patch, replaceAssetId, router, onDone],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`;
      const item: Item = { key, file, status: "checking", progress: 0 };
      setItems((list) => [...list, item]);

      const problem = precheckFile(file.name, file.type, file.size);
      if (problem) return patch(key, { status: "rejected", message: problem });
      const kind = classifyUpload(file.name, file.type)!.kind;
      if (replaceKind && kind !== replaceKind) return patch(key, { status: "rejected", message: `Choose a ${replaceKind} to replace this ${replaceKind}.` });

      let note: string | undefined;
      if (kind === "video") {
        const duration = await readVideoDuration(file);
        if (duration !== null && !isDurationAllowed(duration)) {
          return patch(key, { status: "rejected", message: `${DURATION_ERROR} This one is ${duration.toFixed(1)} seconds.` });
        }
        if (duration === null) note = "This browser can't read the video's length; the server will check it after upload.";
      }

      const ticket = await createUpload({ filename: file.name, size: file.size, mime: file.type, replaceAssetId });
      if (!ticket.ok || !ticket.assetId || !ticket.objectName || !ticket.bucket || !ticket.contentType) {
        return patch(key, { status: "rejected", message: ticket.error ?? "The upload couldn't be started." });
      }
      patch(key, { message: note });
      await startTus(item, { assetId: ticket.assetId, bucket: ticket.bucket, objectName: ticket.objectName, contentType: ticket.contentType });
    },
    [patch, replaceAssetId, replaceKind, startTus],
  );

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).slice(0, replaceAssetId ? 1 : 50);
    files.forEach((f) => void handleFile(f));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    addFiles(e.dataTransfer.files);
  };

  const cancel = async (item: Item) => {
    const up = uploads.current.get(item.key);
    if (up) await up.abort(true).catch(() => undefined);
    uploads.current.delete(item.key);
    if (item.assetId && !replaceAssetId) await cancelUpload(item.assetId);
    patch(item.key, { status: "cancelled", message: "Cancelled." });
  };

  const pause = async (item: Item) => {
    await uploads.current.get(item.key)?.abort(false);
    patch(item.key, { status: "paused" });
  };

  const resume = (item: Item) => {
    const up = uploads.current.get(item.key);
    if (!up) return void handleFile(item.file);
    patch(item.key, { status: "uploading", message: undefined });
    up.start();
  };

  const accept = replaceKind === "image" ? ".jpg,.jpeg,.png,.webp" : replaceKind === "video" ? ".mp4,.mov,.webm" : ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-sm border-2 border-dashed p-8 text-center transition-colors ${over ? "border-body bg-champagne/15" : "border-body/25 bg-white"}`}
      >
        <p className="font-serif text-2xl">{replaceAssetId ? "Drop the replacement file here" : "Drop photos and videos here"}</p>
        <p className="mt-2 text-sm text-body/70">
          Photos: JPEG, PNG or WebP up to {formatBytes(MEDIA_RULES.maxImageBytes)}. Videos: MP4, MOV or WebM, {MEDIA_RULES.videoMinSeconds}–{MEDIA_RULES.videoMaxSeconds} seconds, up to {formatBytes(MEDIA_RULES.maxVideoBytes)}.
        </p>
        <button type="button" className="a-btn-primary mt-5" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple={!replaceAssetId}
          accept={accept}
          aria-label="Choose files to upload"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-4 text-xs text-body/60">Uploading never publishes anything. New files stay private until you publish them.</p>
      </div>

      {items.length ? (
        <ul className="mt-4 space-y-2" aria-label="Uploads">
          {items.map((item) => (
            <li key={item.key} className="a-card flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className={`text-xs ${item.status === "rejected" || item.status === "error" ? "text-[#9b2c1f]" : "text-body/70"}`} role={item.status === "rejected" || item.status === "error" ? "alert" : undefined}>
                  {{
                    checking: "Checking…",
                    rejected: item.message,
                    uploading: `Uploading ${item.progress}%`,
                    paused: `Paused at ${item.progress}%`,
                    finishing: "Finishing…",
                    error: item.message,
                    done: item.message,
                    cancelled: "Cancelled",
                  }[item.status]}
                  {item.status === "uploading" && item.message ? ` — ${item.message}` : ""}
                </p>
                {item.status === "uploading" || item.status === "paused" ? (
                  <progress className="mt-1 h-1.5 w-full accent-body" max={100} value={item.progress} aria-label={`${item.file.name} upload progress`} />
                ) : null}
              </div>
              <div className="flex gap-2">
                {item.status === "uploading" ? <button type="button" className="a-btn" onClick={() => pause(item)}>Pause</button> : null}
                {item.status === "paused" || item.status === "error" ? <button type="button" className="a-btn" onClick={() => resume(item)}>Retry</button> : null}
                {["uploading", "paused", "error"].includes(item.status) ? <button type="button" className="a-btn" onClick={() => cancel(item)}>Cancel</button> : null}
                {["rejected", "done", "cancelled"].includes(item.status) ? (
                  <button type="button" className="a-btn" onClick={() => setItems((l) => l.filter((x) => x.key !== item.key))}>Dismiss</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
