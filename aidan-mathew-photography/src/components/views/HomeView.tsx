import Link from "next/link";
import type { Values } from "@/lib/content/schema";
import type { Settings } from "@/lib/content/entities";
import type { MediaMap } from "@/lib/media";
import { HeroMedia } from "@/components/site/HeroMedia";
import { MediaImage, Placeholder } from "@/components/site/MediaImage";
import { FilmCard } from "@/components/site/FilmCard";
import { ReviewsCarousel, type CarouselReview } from "@/components/site/ReviewsCarousel";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Prose, text } from "@/components/site/Prose";
import { PlayIcon } from "@/components/site/icons";
import { SocialLinks } from "@/components/site/SiteFooter";

export type HomeService = { slug: string; title: string; summary: string; imageId: string; demo?: boolean };
export type HomeFilm = { slug: string; title: string; category: string; kindLabel: string; posterId: string; videoId: string };

type Props = {
  content: Values;
  settings: Settings;
  media: MediaMap;
  services: HomeService[];
  films: HomeFilm[];
  reviews: CarouselReview[];
  demoFilmPosterIds?: string[];
  inquiryTypes: string[];
  demo: boolean;
};

const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export function HomeView({ content: c, settings, media, services, films, reviews, demoFilmPosterIds = [], inquiryTypes, demo }: Props) {
  const filmHref = s(c.hero_film_link) || "/films";
  const aboutVideo = media[s(c.about_video_id)];
  const stats = (Array.isArray(c.stats) ? c.stats : []) as { value?: string; label?: string }[];
  const showStats = c.stats_enabled === true && stats.some((x) => x.value && x.label);

  return (
    <>
      {/* Cinematic hero */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-ivory sm:items-center" aria-labelledby="hero-title">
        <HeroMedia
          mode={c.hero_mode === "video" ? "video" : "image"}
          image={media[s(c.hero_image_id)]}
          video={media[s(c.hero_video_id)]}
          poster={media[s(c.hero_poster_id)]}
          focal={{ x: n(c.hero_focal_x, 50), y: n(c.hero_focal_y, 50) }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/35 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent sm:hidden" aria-hidden="true" />
        <div className="container-x relative z-10 pb-24 pt-32 sm:pb-0">
          <div className="max-w-2xl">
            {s(c.hero_eyebrow) ? <p className="mb-6 text-xs tracking-label text-champagne sm:text-sm">{s(c.hero_eyebrow)}</p> : null}
            <h1 id="hero-title" className="font-serif text-[2.75rem] font-light uppercase leading-[0.95] tracking-[0.04em] sm:text-7xl lg:text-[6.5rem]">
              <span className="block">{s(c.hero_title_1)}</span>
              {s(c.hero_title_2) ? <span className="mt-2 block text-[0.62em] tracking-[0.12em] text-ivory/90">{s(c.hero_title_2)}</span> : null}
            </h1>
            {s(c.hero_subtitle) ? (
              <p className="mt-8 flex items-center gap-4 text-sm tracking-[0.18em] text-ivory/85">
                <span className="h-px w-10 bg-champagne" aria-hidden="true" />
                {s(c.hero_subtitle)}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={filmHref} className="btn btn-light">
                <PlayIcon className="h-3.5 w-3.5" /> Watch Our Film
              </Link>
              <Link href="/booking" className="btn btn-gold">
                Check Availability
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length ? (
        <section className="bg-ink py-24 text-ivory sm:py-32" aria-labelledby="services-title">
          <div className="container-x">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="services-title" className="font-serif text-4xl font-light sm:text-5xl">{text(c.services_heading, "More Than Just Coverage")}</h2>
              {s(c.services_intro) ? <p className="mt-5 text-ivory/75">{s(c.services_intro)}</p> : null}
            </div>
            <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {services.map((svc) => (
                <li key={svc.slug}>
                  <Link href={`/services#${svc.slug}`} className="group relative block overflow-hidden border border-champagne/20">
                    <div className="aspect-[3/4]">
                      {media[svc.imageId] ? (
                        <MediaImage media={media[svc.imageId]} alt="" sizes="(min-width: 1280px) 20vw, (min-width: 640px) 50vw, 100vw" target={800} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
                      ) : (
                        <Placeholder className="h-full w-full" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <h3 className="font-serif text-2xl leading-tight">{svc.title}</h3>
                      {svc.summary ? <p className="mt-2 line-clamp-3 text-sm text-ivory/75">{svc.summary}</p> : null}
                      <span className="mt-4 inline-block border-b border-champagne/60 pb-0.5 text-xs tracking-wide text-champagne">Explore</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {demo && services.some((x) => x.demo) ? (
              <p className="mt-6 text-center text-xs text-ivory/50">Starting categories shown for layout. Publish the services the studio offers to replace them.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* About */}
      <section className="bg-ivory py-24 sm:py-32" aria-labelledby="about-title">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="aspect-[4/5] overflow-hidden">
            <MediaImage media={media[s(c.about_image_id)]} sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" placeholderLabel="Studio photograph" />
          </div>
          <div className="max-w-xl">
            <h2 id="about-title" className="font-serif text-4xl font-light sm:text-5xl">{text(c.about_heading, "The Story Behind the Lens")}</h2>
            <span className="mt-6 block h-px w-16 bg-champagne" aria-hidden="true" />
            <Prose text={c.about_text} className="mt-8 font-serif text-xl leading-[1.7]" />
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/about" className="btn btn-dark">Learn More</Link>
              {aboutVideo ? (
                <Link href="/about#introduction-video" className="btn btn-ghost-dark">
                  <PlayIcon className="h-3.5 w-3.5" /> Watch My Story
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Featured films */}
      <section className="border-t border-stone bg-ivory py-24 sm:py-32" aria-labelledby="films-title">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="films-title" className="font-serif text-4xl font-light sm:text-5xl">{text(c.films_heading, "Real Stories. Real Emotions.")}</h2>
            {s(c.films_intro) ? <p className="mt-5">{s(c.films_intro)}</p> : null}
          </div>
          {films.length ? (
            <ul className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {films.map((f) => (
                <li key={f.slug}>
                  <FilmCard href={`/films/${f.slug}`} title={f.title} category={f.category} kindLabel={f.kindLabel} poster={media[f.posterId]} video={media[f.videoId]} />
                </li>
              ))}
            </ul>
          ) : demo ? (
            <ul className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3" aria-label="Film placeholders">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <FilmCard href={null} title="Film coming soon" category="Placeholder" poster={media[demoFilmPosterIds[i] ?? ""]} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 text-center">
              <Link href="/films" className="underline underline-offset-4">See all films</Link>
            </p>
          )}
          {films.length ? (
            <p className="mt-14 text-center">
              <Link href="/films" className="btn btn-ghost-dark">View All Films</Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* Statistics — hidden until genuine figures are supplied */}
      {showStats ? (
        <section className="bg-ink py-16 text-ivory" aria-label="Studio in numbers">
          <dl className="container-x grid grid-cols-2 gap-10 text-center md:grid-cols-4">
            {stats.filter((x) => x.value && x.label).map((x, i) => (
              <div key={i} className="flex flex-col-reverse">
                <dt className="mt-2 text-sm text-ivory/70">{x.label}</dt>
                <dd className="font-serif text-5xl text-champagne">{x.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Reviews */}
      {reviews.length ? (
        <section className="relative isolate overflow-hidden bg-ink py-28 text-ivory sm:py-36" aria-labelledby="reviews-title">
          <div className="absolute inset-0 -z-10">
            <MediaImage media={media[s(c.reviews_background_id)]} alt="" sizes="100vw" className="h-full w-full" />
            <div className="absolute inset-0 bg-ink/75" aria-hidden="true" />
          </div>
          <div className="container-x">
            <h2 id="reviews-title" className="mb-14 text-center font-serif text-3xl font-light sm:text-4xl">{text(c.reviews_heading, "Words from Our Couples")}</h2>
            <ReviewsCarousel reviews={reviews} />
            <p className="mt-12 text-center">
              <Link href="/reviews" className="text-sm text-champagne underline underline-offset-4">Read all reviews</Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* Inquiry */}
      <section className="bg-ivory py-24 sm:py-32" aria-labelledby="inquiry-title">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <div>
            <h2 id="inquiry-title" className="font-serif text-4xl font-light leading-tight sm:text-5xl">{text(c.inquiry_heading, "Let’s Create Something Beautiful.")}</h2>
            {s(c.inquiry_text) ? <p className="mt-6 max-w-md text-lg">{s(c.inquiry_text)}</p> : null}
            <dl className="mt-10 space-y-4 text-sm">
              {settings.email ? (
                <div>
                  <dt className="text-bronze">Email</dt>
                  <dd><a href={`mailto:${settings.email}`} className="text-lg underline-offset-4 hover:underline">{settings.email}</a></dd>
                </div>
              ) : null}
              {settings.phone ? (
                <div>
                  <dt className="text-bronze">Phone</dt>
                  <dd><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="text-lg underline-offset-4 hover:underline">{settings.phone}</a></dd>
                </div>
              ) : null}
              {settings.service_area ? (
                <div>
                  <dt className="text-bronze">Service area</dt>
                  <dd className="text-lg">{settings.service_area}</dd>
                </div>
              ) : null}
            </dl>
            <SocialLinks settings={settings} className="mt-8 text-body" />
          </div>
          <InquiryForm inquiryTypes={inquiryTypes} compact />
        </div>
      </section>
    </>
  );
}
