"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/lib/content/entities";
import { ChevronDown, CloseIcon, MenuIcon } from "./icons";

type Props = {
  businessName: string;
  logo?: { url: string; w: number; h: number; alt: string } | null;
  nav: NavItem[];
};

type Tree = { label: string; href: string; children: NavItem[] }[];

function buildTree(nav: NavItem[]): Tree {
  const top = nav.filter((n) => !n.group);
  return top.map((n) => ({ label: n.label, href: n.href, children: nav.filter((c) => c.group === n.label) }));
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ businessName, logo, nav }: Props) {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const tree = buildTree(nav);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setSubmenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const transparent = overlay && !scrolled && !open;
  const shell = transparent
    ? "bg-gradient-to-b from-ink/70 to-transparent text-ivory"
    : "bg-ink/95 text-ivory backdrop-blur supports-[backdrop-filter]:bg-ink/85 border-b border-ivory/10";

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${shell}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ivory focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="container-x flex h-20 items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${businessName} — home`}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.url} width={logo.w} height={logo.h} alt={logo.alt || businessName} className="h-10 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="font-serif text-lg uppercase leading-none tracking-[0.18em] sm:text-xl">{businessName}</span>
          )}
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7 text-[13px] tracking-wide">
            {tree.map((item) =>
              item.children.length ? (
                <li key={item.label} className="group relative">
                  <button
                    type="button"
                    className="flex min-h-[44px] items-center gap-1.5 opacity-90 hover:opacity-100"
                    aria-expanded={submenu === item.label}
                    onClick={() => setSubmenu((s) => (s === item.label ? null : item.label))}
                    onKeyDown={(e) => e.key === "Escape" && setSubmenu(null)}
                  >
                    {item.label}
                    <ChevronDown />
                  </button>
                  <ul
                    className={`absolute left-1/2 top-full min-w-[200px] -translate-x-1/2 border border-ivory/10 bg-ink py-2 shadow-xl ${
                      submenu === item.label ? "block" : "hidden group-hover:block group-focus-within:block"
                    }`}
                  >
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <Link
                          href={c.href}
                          className="block px-5 py-2.5 text-ivory/85 hover:bg-ivory/5 hover:text-ivory"
                          aria-current={isActive(pathname, c.href) ? "page" : undefined}
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="relative flex min-h-[44px] items-center opacity-90 hover:opacity-100 aria-[current=page]:opacity-100 aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-2 aria-[current=page]:after:h-px aria-[current=page]:after:bg-champagne"
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/booking" className="btn btn-gold hidden sm:inline-flex">
            Check Availability
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center xl:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="h-[calc(100svh-5rem)] overflow-y-auto border-t border-ivory/10 bg-ink xl:hidden">
        <nav aria-label="Mobile" className="container-x py-8">
          <ul className="space-y-1">
            {tree.map((item) => (
              <li key={item.label}>
                {item.children.length ? (
                  <>
                    <button
                      type="button"
                      className="flex min-h-[48px] w-full items-center justify-between font-serif text-2xl"
                      aria-expanded={submenu === item.label}
                      onClick={() => setSubmenu((s) => (s === item.label ? null : item.label))}
                    >
                      {item.label}
                      <ChevronDown className={`h-4 w-4 transition-transform ${submenu === item.label ? "rotate-180" : ""}`} />
                    </button>
                    <ul hidden={submenu !== item.label} className="mb-3 space-y-1 border-l border-champagne/30 pl-5">
                      {item.children.map((c) => (
                        <li key={c.label}>
                          <Link href={c.href} className="flex min-h-[44px] items-center text-ivory/80">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="flex min-h-[48px] items-center font-serif text-2xl aria-[current=page]:text-champagne"
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Link href="/booking" className="btn btn-gold mt-8 w-full">
            Check Availability
          </Link>
        </nav>
      </div>
    </header>
  );
}
