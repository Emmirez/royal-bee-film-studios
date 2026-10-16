import { ArrowRight, ExternalLink, Quote } from 'lucide-react';
import Seo from '../../components/public/Seo';
import SmartImage from '../../components/media/SmartImage';
import Button from '../../components/ui/Button';
import PageHero from '../../features/public/components/PageHero';
import ProductionCard from '../../features/public/components/ProductionCard';
import FounderGallery from '../../features/public/founder/FounderGallery';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useFounder } from '../../features/public/publicApi';
import { formatDate, titleCase } from '../../lib/format';

function Block({ eyebrow, title, children, id }) {
  return (
    <section aria-labelledby={id} className="border-t border-paper-300 py-14 first:border-t-0 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-16">
        <div>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2 id={id} className="font-display text-3xl font-semibold">
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

/** Dedicated founder page (About → Founder). Only verified achievements are ever shown. */
export default function FounderPage() {
  const { data: f, isLoading, error, refetch } = useFounder();
  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  return (
    <>
      <Seo title={f.name} description={f.shortBio} image={f.portrait} seo={f.seo} />
      <PageHero
        eyebrow="About · The Founder"
        title={f.name}
        intro={f.title}
        image={f.coverImage}
        breadcrumbs={[{ label: 'About' }, { label: 'The Founder' }]}
      />

      {/* Portrait + biography */}
      <section className="bg-paper-100 py-16 sm:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SmartImage image={f.portrait} alt={f.portrait?.alt || f.name} width={1100} sizes="(min-width:1024px) 40vw, 100vw" aspect="4/5" rounded priority className="shadow-lift" />
            {f.links?.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {f.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-paper-400 px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-900">
                      {l.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            {f.quote && (
              <blockquote className="mb-12">
                <Quote className="mb-4 h-8 w-8 text-gold-500" aria-hidden />
                <p className="font-display text-3xl italic leading-snug text-ink-900 sm:text-4xl">{f.quote}</p>
              </blockquote>
            )}
            <h2 className="eyebrow mb-6">Biography</h2>
            <div className="space-y-6">
              {(f.biography?.length ? f.biography : [f.shortBio]).filter(Boolean).map((p, i) => (
                <p key={i} className={i === 0 ? 'text-xl leading-relaxed text-ink-800' : 'prose-body'}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-paper-50">
        <div className="container-site">
          {(f.vision || f.philosophy) && (
            <Block eyebrow="Vision" title="Vision & philosophy" id="vision-heading">
              <div className="grid gap-10 md:grid-cols-2">
                {f.vision && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">Vision</h3>
                    <p className="prose-body">{f.vision}</p>
                  </div>
                )}
                {f.philosophy && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">Creative philosophy</h3>
                    <p className="prose-body">{f.philosophy}</p>
                  </div>
                )}
              </div>
            </Block>
          )}

          {f.experience?.length > 0 && (
            <Block eyebrow="Career" title="Experience" id="experience-heading">
              <ol className="relative space-y-8 border-l border-paper-400 pl-8">
                {f.experience.map((e) => (
                  <li key={e._id || `${e.role}-${e.period}`} className="relative">
                    <span className="absolute -left-[37px] top-1.5 h-3 w-3 rounded-full border-2 border-gold-500 bg-paper-50" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{e.period}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink-900">
                      {e.role}
                      {e.organization && <span className="font-normal text-ink-600"> · {e.organization}</span>}
                    </h3>
                    {e.description && <p className="mt-2 text-ink-600">{e.description}</p>}
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {f.achievements?.length > 0 && (
            <Block eyebrow="Recognition" title="Achievements" id="achievements-heading">
              <ul className="grid gap-4 sm:grid-cols-2">
                {f.achievements.map((a) => (
                  <li key={`${a.title}-${a.year}`} className="rounded-2xl border border-paper-300 bg-paper-100 p-6">
                    {a.year && <p className="font-mono text-xs text-gold-700">{a.year}</p>}
                    <h3 className="mt-1 font-semibold text-ink-900">{a.title}</h3>
                    {a.description && <p className="mt-2 text-sm text-ink-600">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {f.mediaAppearances?.length > 0 && (
            <Block eyebrow="Press" title="Media & interviews" id="media-heading">
              <ul className="divide-y divide-paper-300">
                {f.mediaAppearances.map((m) => (
                  <li key={m._id || m.title} className="flex flex-wrap items-center justify-between gap-3 py-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
                        {titleCase(m.type || 'feature')}
                        {m.outlet ? ` · ${m.outlet}` : ''}
                        {m.date ? ` · ${formatDate(m.date)}` : ''}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-ink-900">{m.title}</h3>
                    </div>
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-800 underline-offset-4 hover:underline">
                        Read / watch <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </div>

      {f.gallery?.length > 0 && (
        <section aria-labelledby="founder-gallery-heading" className="bg-paper-100 py-16 sm:py-24">
          <div className="container-site">
            <p className="eyebrow mb-4">Gallery</p>
            <h2 id="founder-gallery-heading" className="heading-md mb-10">
              Portraits & moments
            </h2>
            <FounderGallery images={f.gallery} />
          </div>
        </section>
      )}

      {f.relatedProductions?.length > 0 && (
        <section aria-labelledby="founder-work-heading" className="bg-paper-200 py-16 sm:py-24">
          <div className="container-site">
            <p className="eyebrow mb-4">Selected work</p>
            <h2 id="founder-work-heading" className="heading-md mb-10">
              Productions
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {f.relatedProductions.map((p) => (
                <ProductionCard key={p.id} production={p} size="sm" />
              ))}
            </div>
          </div>
        </section>
      )}

          <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
        <section className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 px-6 py-16 text-center text-paper-50 sm:rounded-[40px] sm:py-20">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative">
            <h2 className="heading-md text-balance">Let’s make something together.</h2>
            <Button to={f.cta?.href || '/enquire'} variant="gold" size="lg" iconRight={ArrowRight} className="mt-8">
              {f.cta?.label || 'Work with us'}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
