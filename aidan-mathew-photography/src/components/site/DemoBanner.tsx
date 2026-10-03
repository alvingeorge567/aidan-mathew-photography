/** Fixed to the bottom so it never hides behind the transparent header. */
export function DemoBanner() {
  return (
    <>
      <div role="note" className="fixed inset-x-0 bottom-0 z-40 bg-champagne px-4 py-2 text-center text-xs text-ink">
        Development preview: this site is showing placeholder content that the studio has not published yet.
      </div>
      <div aria-hidden="true" className="h-9 bg-ink" />
    </>
  );
}
