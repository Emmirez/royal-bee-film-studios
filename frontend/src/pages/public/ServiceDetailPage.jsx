import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import PageHero from '../../features/public/components/PageHero';
import ProductionCard from '../../features/public/components/ProductionCard';
import CtaButtons from '../../features/public/components/CtaButtons';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useService } from '../../features/public/publicApi';
import { cx, formatMoney } from '../../lib/format';

function Faq({ item }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${item.id}`;
  return (
    <div className="border-b border-paper-300">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold text-ink-900">
          {item.question}
          <ChevronDown className={cx('h-5 w-5 shrink-0 text-ink-500 transition', open && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-6 text-ink-600">
        {item.answer}
      </div>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { data: s, isLoading, error, refetch } = useService(slug);
  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  const enquireHref = `/enquire?service=${s.slug}`;
  const ctas = s.ctas?.length ? s.ctas : [{ label: s.cta?.label || 'Start a project', href: s.cta?.href || enquireHref, variant: 'primary' }];

  return (
    <>
      <Seo title={s.title} description={s.summary} image={s.coverImage} seo={s.seo} />
      <PageHero eyebrow="Service" title={s.title} intro={s.summary} image={s.coverImage} breadcrumbs={[{ label: 'Services', to: '/services' }, { label: s.title }]}>
        <CtaButtons ctas={ctas} on="light" className="mt-10" />
      </PageHero>

      <section className="bg-paper-100 py-16 sm:py-24">
        <div className="container-site grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            {s.description && <p className="whitespace-pre-line text-xl leading-relaxed text-ink-800">{s.description}</p>}
            {s.process?.length > 0 && (
              <div className="mt-16">
                <h2 className="eyebrow mb-8">How we work</h2>
                <ol className="grid gap-5 sm:grid-cols-2">
                  {s.process.map((step, i) => (
                    <li key={step.title} className="rounded-2xl border border-paper-300 bg-paper-50 p-6">
                      <span className="font-mono text-xs text-gold-700">Step {String(i + 1).padStart(2, '0')}</span>
                      <h3 className="mt-2 font-display text-2xl font-semibold">{step.title}</h3>
                      {step.description && <p className="mt-2 text-sm text-ink-600">{step.description}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="space-y-8">
            {s.benefits?.length > 0 && (
              <div className="rounded-3xl bg-ink-950 p-8 text-paper-100">
                <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">Why Royal Bee</h2>
                <ul className="space-y-4">
                  {s.benefits.map((b) => (
                    <li key={b} className="flex gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.deliverables?.length > 0 && (
              <div className="rounded-3xl border border-paper-300 bg-paper-50 p-8">
                <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-700">Deliverables</h2>
                <ul className="space-y-3 text-ink-700">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      {s.packages?.length > 0 && (
        <section aria-labelledby="packages-heading" className="bg-paper-200 py-16 sm:py-24">
          <div className="container-site">
            <p className="eyebrow mb-4">Packages</p>
            <h2 id="packages-heading" className="heading-md">Ways to work with us</h2>
            <p className="mt-3 max-w-2xl text-sm text-ink-500">Prices shown are indicative estimates only. A formal quotation is issued after we review your project — an estimate is not a contract.</p>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {s.packages.map((p) => (
                <div key={p.id} className={cx('flex flex-col rounded-3xl border p-8', p.isFeatured ? 'border-ink-900 bg-ink-950 text-paper-100' : 'border-paper-300 bg-paper-50')}>
                  <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
                  <p className={cx('mt-4 font-display text-3xl', p.isFeatured ? 'text-gold-300' : 'text-ink-900')}>
                    {p.price != null ? (
                      <>
                        {p.priceLabel && <span className="mr-1 text-sm font-sans opacity-70">{p.priceLabel}</span>}
                        <span className="tabular">{formatMoney(p.price, p.currency || 'NGN')}</span>
                      </>
                    ) : (
                      <span className="text-xl">Price on request</span>
                    )}
                  </p>
                  {p.description && <p className={cx('mt-3 text-sm', p.isFeatured ? 'text-paper-300' : 'text-ink-600')}>{p.description}</p>}
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button to={enquireHref} variant={p.isFeatured ? 'gold' : 'dark'} iconRight={ArrowRight} className="mt-8 w-full justify-center">
                    Request a quote
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {s.portfolio?.length > 0 && (
        <section aria-labelledby="portfolio-heading" className="bg-paper-100 py-16 sm:py-24">
          <div className="container-site">
            <p className="eyebrow mb-4">Portfolio</p>
            <h2 id="portfolio-heading" className="heading-md mb-10">Related work</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {s.portfolio.map((p) => (
                <ProductionCard key={p.id} production={p} size="sm" />
              ))}
            </div>
          </div>
        </section>
      )}

      {s.testimonials?.length > 0 && (
        <section className="bg-paper-50 py-16 sm:py-20">
          <div className="container-site grid gap-6 md:grid-cols-2">
            {s.testimonials.map((t) => (
              <figure key={t.quote} className="rounded-3xl border border-paper-300 p-8">
                <blockquote className="font-display text-2xl leading-snug">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{t.author}</span>
                  {t.role && <span className="text-ink-500"> · {t.role}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {s.faqs?.length > 0 && (
        <section aria-labelledby="faq-heading" className="bg-paper-100 py-16 sm:py-24">
          <div className="container-site grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="eyebrow mb-4">FAQ</p>
              <h2 id="faq-heading" className="heading-md">Questions, answered</h2>
            </div>
            <div className="border-t border-paper-300">
              {s.faqs.map((f) => (
                <Faq key={f.id} item={f} />
              ))}
            </div>
          </div>
        </section>
      )}

            <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
        <section className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 px-6 py-14 text-paper-50 sm:rounded-[40px] sm:px-12 sm:py-20 lg:px-16">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <h2 className="heading-md max-w-xl text-balance">Ready to talk about your {s.title.toLowerCase()} project?</h2>
            <Button to={enquireHref} variant="gold" size="lg" iconRight={ArrowRight} className="shrink-0">
              Start a project
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
