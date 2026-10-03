import type { Metadata } from "next";
import { getMedia, getPage, getReviews, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/site/PageIntro";
import { Prose, text } from "@/components/site/Prose";
import { MediaImage } from "@/components/site/MediaImage";
import { ReviewForm } from "@/components/site/ReviewForm";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("reviews")]);
  return pageMetadata({ settings, content: page.content, path: "/reviews", fallbackTitle: "Client Reviews" });
}

export default async function ReviewsPage() {
  const [page, reviews] = await Promise.all([getPage("reviews"), getReviews({ featuredFirst: true })]);
  const c = page.content;
  const media = await getMedia(reviews.map((r) => r.photo_media_id));
  const submissionsOpen = page.published && c.submissions_enabled === true;

  return (
    <>
      <PageIntro title={text(c.heading, "Kind Words")} intro={<Prose text={c.intro} />} />
      <section className="bg-ivory pb-24" aria-label="Reviews">
        <div className="container-x">
          {reviews.length ? (
            <ul className="columns-1 gap-8 md:columns-2 [&>li]:mb-8">
              {reviews.map((r) => {
                const photo = r.photo_media_id ? media[r.photo_media_id] : undefined;
                return (
                  <li key={r.id} className="break-inside-avoid border border-stone bg-white/40">
                    <figure>
                      {photo ? (
                        <div className="aspect-[3/2] overflow-hidden">
                          <MediaImage media={photo} sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full" />
                        </div>
                      ) : null}
                      <div className="p-8">
                        {r.rating ? (
                          <p className="mb-4 text-bronze" aria-label={`Rated ${r.rating} out of 5`}>
                            {"★".repeat(r.rating)}
                            <span className="text-stone">{"★".repeat(5 - r.rating)}</span>
                          </p>
                        ) : null}
                        <blockquote className="whitespace-pre-line font-serif text-xl leading-relaxed">“{r.review_text}”</blockquote>
                        <figcaption className="mt-6 text-sm">
                          {r.display_name}
                          {r.event_type ? <span className="text-body/65"> — {r.event_type}</span> : null}
                        </figcaption>
                      </div>
                    </figure>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="max-w-prose py-6">Reviews from couples will appear here once they have given permission to publish them.</p>
          )}
        </div>
      </section>
      {submissionsOpen ? (
        <section className="border-t border-stone bg-ivory py-20" aria-labelledby="leave-review">
          <div className="container-x max-w-3xl">
            <h2 id="leave-review" className="font-serif text-4xl font-light">Share Your Experience</h2>
            <Prose text={c.submission_intro} className="mt-4 max-w-prose" />
            <div className="mt-10">
              <ReviewForm />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
