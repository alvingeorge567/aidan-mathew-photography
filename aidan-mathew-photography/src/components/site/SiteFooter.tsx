import Link from "next/link";
import type { Settings } from "@/lib/content/entities";
import { SOCIAL_KEYS, SOCIAL_LABELS, SocialIcon } from "./icons";

export function SocialLinks({ settings, className = "" }: { settings: Settings; className?: string }) {
  const links = SOCIAL_KEYS.filter((k) => settings[k]);
  if (!links.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((k) => (
        <li key={k}>
          <a
            href={settings[k]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center border border-current/30 opacity-80 transition-opacity hover:opacity-100"
          >
            <SocialIcon name={k} />
            <span className="sr-only">{SOCIAL_LABELS[k]} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ settings }: { settings: Settings }) {
  const top = settings.nav.filter((n) => !n.group);
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-ivory/80">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl uppercase tracking-[0.16em] text-ivory">{settings.business_name}</p>
          {settings.tagline ? <p className="mt-2 text-sm text-ivory/60">{settings.tagline}</p> : null}
          {settings.footer_text ? <p className="mt-6 max-w-sm text-sm leading-relaxed">{settings.footer_text}</p> : null}
          <SocialLinks settings={settings} className="mt-6 text-ivory" />
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-medium text-champagne">Explore</h2>
          <ul className="mt-4 space-y-1 text-sm">
            {top.map((n) => (
              <li key={n.label}>
                <Link href={n.href} className="inline-flex min-h-[36px] items-center hover:text-ivory">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/storytelling" className="inline-flex min-h-[36px] items-center hover:text-ivory">
                Wedding Stories
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-medium text-champagne">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-ivory">{settings.email}</a>
              </li>
            ) : null}
            {settings.phone ? (
              <li>
                <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="hover:text-ivory">{settings.phone}</a>
              </li>
            ) : null}
            {settings.service_area ? <li>{settings.service_area}</li> : null}
            <li>
              <Link href="/booking" className="btn btn-gold mt-2">Check Availability</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.business_name}. All rights reserved.</p>
          <ul className="flex gap-5">
            <li><Link href="/privacy" className="hover:text-ivory">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-ivory">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
