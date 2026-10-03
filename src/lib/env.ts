export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Optional: a dedicated storage hostname (https://<ref>.storage.supabase.co) is faster for large uploads. */
  storageUploadUrl: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_UPLOAD_URL ?? "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function resumableUploadEndpoint(): string {
  const base = env.storageUploadUrl || `${env.supabaseUrl}/storage/v1`;
  return `${base.replace(/\/$/, "")}/upload/resumable`;
}
