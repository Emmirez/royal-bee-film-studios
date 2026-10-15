import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import ServiceIcon from '../../components/ServiceIcon';
import { imageUrl } from '../../../../lib/images';

/** Numbered service list — hover reveals the service image on desktop. */
export default function ServicesSection({ data, content = {}, theme }) {
  const items = data?.items || [];
  if (!items.length) return null;

  return (
    <SectionShell theme={theme || 'warm'} labelledBy="services-heading">
      <SectionHeading id="services-heading" eyebrow={content.eyebrow || 'What we do'} heading={content.heading || 'Production services'} intro={content.intro} />
      <ul className="border-t border-ink-900/15">
        {items.map((s, i) => (
          <li key={s.id} className="border-b border-ink-900/15">
            <Link to={`/services/${s.slug}`} className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-5 py-7 sm:gap-10 sm:py-9">
              <span className="font-mono text-xs tabular text-ink-500">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-4">
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-900/15 text-gold-700 transition group-hover:border-gold-500 group-hover:bg-ink-900 group-hover:text-gold-300 sm:flex">
                    <ServiceIcon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="font-display text-2xl font-semibold leading-tight text-ink-900 transition group-hover:translate-x-1 sm:text-[2.1rem]">
                    {s.title}
                  </span>
                </span>
                {s.summary && <span className="mt-2 block max-w-2xl text-[15px] text-ink-600 sm:pl-16">{s.summary}</span>}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/20 text-ink-800 transition group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-paper-100">
                <ArrowUpRight className="h-5 w-5" aria-hidden />
              </span>
              {s.coverImage?.url && (
                <img
                  src={imageUrl(s.coverImage, 500)}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="pointer-events-none absolute right-24 top-1/2 hidden h-40 w-60 -translate-y-1/2 rotate-2 rounded-xl object-cover opacity-0 shadow-lift transition duration-500 group-hover:rotate-0 group-hover:opacity-100 xl:block"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
