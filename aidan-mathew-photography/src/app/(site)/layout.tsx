import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { getMedia, getSettings, isDemoMode } from "@/lib/data/public";
import { pickImage } from "@/lib/media";
import { env } from "@/lib/env";
import { SOCIAL_KEYS } from "@/components/site/icons";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, demo] = await Promise.all([getSettings(), isDemoMode()]);
  const logoMedia = settings.logo_id ? (await getMedia([settings.logo_id]))[settings.logo_id] : undefined;
  const logoImg = logoMedia ? pickImage(logoMedia, 480) : null;

  // Structured data limited to facts the owner has entered. No address, ratings or reviews are invented.
  const sameAs = SOCIAL_KEYS.map((k) => settings[k]).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: settings.business_name,
    url: env.siteUrl,
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.service_area ? { areaServed: settings.service_area } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(logoImg ? { logo: logoImg.url } : {}),
  };

  return (
    <>
      <SiteHeader
        businessName={settings.business_name}
        nav={settings.nav}
        logo={logoImg && logoMedia ? { url: logoImg.url, w: logoImg.w, h: logoImg.h, alt: logoMedia.alt } : null}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} />
      {demo ? <DemoBanner /> : null}
      {!demo ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
    </>
  );
}
