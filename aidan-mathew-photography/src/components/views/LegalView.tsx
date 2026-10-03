import type { Values } from "@/lib/content/schema";
import { Prose, text } from "@/components/site/Prose";

export function LegalView({ content: c, fallbackTitle }: { content: Values; fallbackTitle: string }) {
  const updated = typeof c.updated === "string" && c.updated ? c.updated : "";
  return (
    <article className="bg-ivory pb-24 pt-36 sm:pt-44">
      <div className="container-x">
        <h1 className="font-serif text-5xl font-light">{text(c.heading, fallbackTitle)}</h1>
        {updated ? <p className="mt-4 text-sm text-bronze">Last updated {updated}</p> : null}
        <Prose text={c.body} className="mt-12 max-w-prose leading-relaxed" />
      </div>
    </article>
  );
}
