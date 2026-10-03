"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/app/admin/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/films", label: "Films" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children, name, businessName }: { children: ReactNode; name: string; businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-body lg:grid lg:grid-cols-[240px_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex items-center justify-between bg-ink px-4 py-3 text-ivory lg:hidden">
        <span className="font-serif text-lg">{businessName}</span>
        <button type="button" className="a-btn border-ivory/30 bg-transparent text-ivory" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          Menu
        </button>
      </div>
      <aside id="admin-nav" className={`${open ? "block" : "hidden"} bg-ink text-ivory lg:sticky lg:top-0 lg:block lg:h-screen`}>
        <div className="flex h-full flex-col">
          <div className="hidden px-6 py-6 lg:block">
            <p className="font-serif text-xl leading-tight">{businessName}</p>
            <p className="mt-1 text-xs text-ivory/60">Studio admin</p>
          </div>
          <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
            <ul className="space-y-0.5">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active(n.href) ? "page" : undefined}
                    className="block rounded-sm px-3 py-2.5 text-sm text-ivory/80 hover:bg-ivory/10 hover:text-ivory aria-[current=page]:bg-ivory/10 aria-[current=page]:text-champagne"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-ivory/10 px-6 py-4 text-sm">
            <p className="truncate text-ivory/70">{name}</p>
            <div className="mt-2 flex gap-4">
              <Link href="/" target="_blank" className="text-champagne underline-offset-2 hover:underline">View site</Link>
              <form action={signOut}>
                <button type="submit" className="text-ivory/80 underline-offset-2 hover:underline">Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}

export function AdminHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-body/75">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
