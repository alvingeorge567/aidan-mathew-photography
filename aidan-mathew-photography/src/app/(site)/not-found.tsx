import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-ivory pb-32 pt-44">
      <div className="container-x max-w-2xl">
        <h1 className="font-serif text-5xl font-light">This page isn’t here.</h1>
        <p className="mt-6 text-lg">It may have been moved or unpublished.</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-dark">Go to the homepage</Link>
          <Link href="/portfolio" className="btn btn-ghost-dark">Browse the portfolio</Link>
        </div>
      </div>
    </section>
  );
}
