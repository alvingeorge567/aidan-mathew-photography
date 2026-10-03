import type { ReactNode } from "react";

/** Opening band for interior pages, sitting below the fixed header. */
export function PageIntro({ title, intro, children, tone = "light" }: { title: string; intro?: ReactNode; children?: ReactNode; tone?: "light" | "dark" }) {
  return (
    <header className={`${tone === "dark" ? "bg-ink text-ivory" : "bg-ivory text-body"} pb-16 pt-36 sm:pb-20 sm:pt-44`}>
      <div className="container-x">
        <h1 className="max-w-4xl font-serif text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">{title}</h1>
        {intro ? <div className={`mt-8 max-w-prose text-lg ${tone === "dark" ? "text-ivory/80" : ""}`}>{intro}</div> : null}
        {children}
      </div>
    </header>
  );
}
