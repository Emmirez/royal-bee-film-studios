import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Lightbox from '../../components/media/Lightbox';
import SmartImage from '../../components/media/SmartImage';
import SampleBadge from '../../components/media/SampleBadge';
import PageHero from '../../features/public/components/PageHero';
import ProductionCard from '../../features/public/components/ProductionCard';
import CtaButtons from '../../features/public/components/CtaButtons';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useProduction } from '../../features/public/publicApi';
import { embedUrl, videoFileUrl } from '../../lib/images';
import { formatDate } from '../../lib/format';

function TrailerModal({ open, onClose, trailer, title }) {
  const embed = embedUrl(trailer);
  const file = !embed ? videoFileUrl(trailer) : null;
  return (
    <Modal open={open} onClose={onClose} title={`${title} — trailer`} size="xl" className="!bg-ink-950 !text-paper-100">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {embed ? (
          <iframe src={embed} title={`${title} trailer`} allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen className="h-full w-full" />
        ) : file ? (
          <video src={file} controls playsInline className="h-full w-full">
            <track kind="captions" />
          </video>
        ) : null}
      </div>
    </Modal>
  );
}

export default function ProductionDetailPage() {
  const { slug } = useParams();
  const { data: p, isLoading, error, refetch } = useProduction(slug);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [lightbox, setLightbox] = useState({ list: [], index: null });

  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  const stills = (p.gallery || []).filter((m) => m.kind === 'image' && m.image?.url);
  const bts = (p.behindTheScenes || []).filter((m) => m.kind === 'image' && m.image?.url);
  const facts = [
    ['Category', p.category],
    ['Year', p.year],
    ['Released', p.releaseDate && formatDate(p.releaseDate)],
    ['Runtime', p.runtimeMinutes && `${p.runtimeMinutes} min`],
    ['Client', p.client],
  ].filter(([, v]) => v);

  const MediaGrid = ({ list, label }) => (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {list.map((m, i) => (
        <li key={m.id || i}>
          <button type="button" onClick={() => setLightbox({ list, index: i })} className="group block w-full overflow-hidden rounded-2xl" aria-label={`Open ${label} ${i + 1}${m.caption ? `: ${m.caption}` : ''}`}>
            <SmartImage image={m.image} alt={m.image?.alt || m.caption || ''} width={800} sizes="(min-width:1024px) 33vw, 50vw" aspect="3/2" imgClassName="transition-transform duration-700 group-hover:scale-105" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <Seo title={p.title} description={p.logline} image={p.coverImage} seo={p.seo} />
      <PageHero eyebrow={`${p.category}${p.year ? ` · ${p.year}` : ''}`} title={p.title} intro={p.logline} image={p.coverImage} breadcrumbs={[{ label: 'Productions', to: '/productions' }, { label: p.title }]}>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {p.trailer && (
            <Button variant="gold" size="lg" icon={Play} onClick={() => setTrailerOpen(true)}>
              Watch trailer
            </Button>
          )}
          <SampleBadge show={p.isPlaceholder} />
        </div>
      </PageHero>

      <section className="bg-paper-100 py-16 sm:py-24">
        <div className="container-site grid gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          <div>
            <h2 className="eyebrow mb-6">Synopsis</h2>
            <p className="whitespace-pre-line text-xl leading-relaxed text-ink-800">{p.synopsis || p.logline}</p>
            {p.tags?.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <li key={t} className="rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-600">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="space-y-8">
            {facts.length > 0 && (
              <dl className="divide-y divide-paper-300 rounded-3xl border border-paper-300 bg-paper-50 px-7">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-4 text-sm">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="font-semibold text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {p.credits?.length > 0 && (
              <div>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-700">Credits</h2>
                <dl className="space-y-2.5 text-sm">
                  {p.credits.map((c, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <dt className="text-ink-500">{c.role}</dt>
                      <dd className="text-right font-medium text-ink-900">{c.name}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {p.services?.length > 0 && (
              <p className="text-sm text-ink-600">
                Services:{' '}
                {p.services.map((s, i) => (
                  <span key={s.slug}>
                    <a href={`/services/${s.slug}`} className="font-semibold text-ink-900 underline-offset-4 hover:underline">
                      {s.title}
                    </a>
                    {i < p.services.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}
          </aside>
        </div>
      </section>

      {stills.length > 0 && (
        <section aria-labelledby="stills-heading" className="bg-paper-50 py-16">
          <div className="container-site">
            <h2 id="stills-heading" className="heading-md mb-8">Stills</h2>
            <MediaGrid list={stills} label="still" />
          </div>
        </section>
      )}

      {bts.length > 0 && (
        <section aria-labelledby="bts-heading" className="bg-paper-200 py-16">
          <div className="container-site">
            <h2 id="bts-heading" className="heading-md mb-8">Behind the scenes</h2>
            <MediaGrid list={bts} label="behind-the-scenes photo" />
          </div>
        </section>
      )}

      {p.related?.length > 0 && (
        <section aria-labelledby="related-heading" className="bg-paper-100 py-16 sm:py-24">
          <div className="container-site">
            <h2 id="related-heading" className="heading-md mb-10">Related productions</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.related.map((r) => (
                <ProductionCard key={r.id} production={r} size="sm" />
              ))}
            </div>
          </div>
        </section>
      )}

            <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
        <section className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 px-6 py-14 text-paper-50 sm:rounded-[40px] sm:px-12 sm:py-20 lg:px-16">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <h2 className="heading-md max-w-xl text-balance">Want to make something like this?</h2>
            {p.ctas?.length ? <CtaButtons ctas={p.ctas} on="light" /> : <Button to="/enquire" variant="gold" size="lg" iconRight={ArrowRight} className="shrink-0">Start a project</Button>}
          </div>
        </section>
      </div>

      {p.trailer && <TrailerModal open={trailerOpen} onClose={() => setTrailerOpen(false)} trailer={p.trailer} title={p.title} />}
      <Lightbox items={lightbox.list} index={lightbox.index} onClose={() => setLightbox({ list: [], index: null })} onIndexChange={(i) => setLightbox((l) => ({ ...l, index: i }))} />
    </>
  );
}
