function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

export const config = {
  supabaseUrl: () => required("SUPABASE_URL"),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  workerId: process.env.WORKER_ID || `worker-${process.pid}`,
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 3000),
  ffmpeg: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobe: process.env.FFPROBE_PATH || "ffprobe",
  email: {
    provider: (process.env.EMAIL_PROVIDER || "none").toLowerCase(),
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "",
    siteUrl: (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, ""),
  },
  abandonedUploadHours: Number(process.env.ABANDONED_UPLOAD_HOURS || 24),
  retention: {
    autoPurge: process.env.RETENTION_AUTO_PURGE === "true",
    days: Number(process.env.RETENTION_DAYS || 730),
  },
};
