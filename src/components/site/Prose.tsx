import { Fragment } from "react";

/**
 * Renders admin-entered plain text safely (no HTML): blank lines separate paragraphs,
 * "## " starts a subheading. Bracketed text is a placeholder and is styled as such.
 */
export function Prose({ text, className = "" }: { text: unknown; className?: string }) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) return null;
  const blocks = value.split(/\n{2,}/);
  return (
    <div className={`space-y-5 ${className}`}>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-4 font-serif text-2xl text-current">
              {block.slice(3)}
            </h2>
          );
        }
        const placeholder = /^\[.*\]$/s.test(block.trim());
        return (
          <p key={i} className={placeholder ? "italic opacity-70" : undefined}>
            {block.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function text(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
