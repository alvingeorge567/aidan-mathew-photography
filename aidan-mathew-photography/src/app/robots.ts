import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Keeps admin and preview pages out of search results. This is not access control —
// those routes are protected by authentication and server-side authorization.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/preview"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
