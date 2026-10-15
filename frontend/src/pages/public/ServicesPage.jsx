import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Seo from '../../components/public/Seo';
import SmartImage from '../../components/media/SmartImage';
import PageHero from '../../features/public/components/PageHero';
import ServiceIcon from '../../features/public/components/ServiceIcon';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useServices } from '../../features/public/publicApi';
import { formatMoney } from '../../lib/format';

export default function ServicesPage() {
  const { data: services = [], isLoading, error, refetch } = useServices();
  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  return (
    <>
      <Seo title="Services" description="Film, commercial, documentary, music video and post-production services." />
      <PageHero eyebrow="Services" title="From first idea to final master." intro="Every service is backed by experienced crews, cinema-grade equipment and a dedicated post-production team." breadcrumbs={[{ label: 'Services' }]} />
      <section className="bg-paper-100 pb-24">
        <div className="container-site grid gap-6 md:grid-cols-2">
          {services.map((s, i) => (
            <Link key={s.id} to={`/services/${s.slug}`} className="group relative flex flex-col overflow-hidden rounded-3xl border border-paper-300 bg-paper-50 transition hover:-translate-y-1 hover:shadow-lift">
              <SmartImage image={s.coverImage} alt="" width={900} sizes="(min-width:768px) 50vw, 100vw" aspect="16/9" imgClassName="transition-transform duration-700 group-hover:scale-105" />
              <div className="flex flex-1 flex-col p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-gold-300">
                    <ServiceIcon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="mt-6 font-display text-3xl font-semibold text-ink-900">{s.title}</h2>
                <p className="mt-3 flex-1 text-ink-600">{s.summary}</p>
                <div className="mt-6 flex items-center justify-between border-t border-paper-300 pt-5">
                  <span className="text-sm text-ink-500">
                    {s.startingPrice ? (
                      <>
                        From <span className="font-semibold text-ink-900 tabular">{formatMoney(s.startingPrice.amount, s.startingPrice.currency)}</span>
                      </>
                    ) : (
                      'Custom quotation'
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
                    Explore <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
