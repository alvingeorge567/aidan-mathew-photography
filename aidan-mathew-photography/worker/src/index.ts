import { config } from "./config.ts";
import { db } from "./supabase.ts";
import { processMediaJob, type ProcessingJob } from "./jobs.ts";
import { processNotificationJob, type NotificationJob } from "./email.ts";
import { cleanAbandonedUploads, purgePersonalData } from "./maintenance.ts";
import { run } from "./probe.ts";

let stopping = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function claimMedia(): Promise<ProcessingJob | null> {
  const { data, error } = await db().rpc("claim_processing_job", { p_worker: config.workerId });
  if (error) throw new Error(`claim_processing_job: ${error.message}`);
  return (data as ProcessingJob[] | null)?.[0] ?? null;
}

async function claimNotification(): Promise<NotificationJob | null> {
  const { data, error } = await db().rpc("claim_notification_job");
  if (error) throw new Error(`claim_notification_job: ${error.message}`);
  return (data as NotificationJob[] | null)?.[0] ?? null;
}

async function main() {
  for (const bin of [config.ffmpeg, config.ffprobe]) {
    const r = await run(bin, ["-version"], 10_000).catch(() => ({ code: 1 }));
    if (r.code !== 0) throw new Error(`${bin} is not installed or not on PATH. Install FFmpeg (see worker/Dockerfile).`);
  }
  console.log(`[worker ${config.workerId}] started; email provider: ${config.email.provider}`);
  let lastMaintenance = 0;

  while (!stopping) {
    let didWork = false;
    try {
      const job = await claimMedia();
      if (job) {
        didWork = true;
        await processMediaJob(job);
      }
      const note = await claimNotification();
      if (note) {
        didWork = true;
        await processNotificationJob(note);
      }
      if (Date.now() - lastMaintenance > 60 * 60_000) {
        lastMaintenance = Date.now();
        await cleanAbandonedUploads();
        await purgePersonalData();
      }
    } catch (err) {
      console.error("[worker] loop error:", err instanceof Error ? err.message : err);
      await sleep(10_000);
    }
    if (!didWork) await sleep(config.pollIntervalMs);
  }
  console.log("[worker] stopped");
}

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} received; finishing the current job`);
    stopping = true;
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
