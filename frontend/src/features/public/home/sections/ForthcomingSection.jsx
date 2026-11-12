import { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import SmartImage from '../../../../components/media/SmartImage';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import { releaseLabel, stageLabel } from '../../../../lib/productionStages';
import { cx } from '../../../../lib/format';

/** One tall poster card for a forthcoming production. */
function ForthcomingCard({ p, dark }) {
  const when = releaseLabel(p);
  return (
    <li className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-3.75rem)/4)]">
      <Link to={`/productions/${p.slug}`} className="group block focus:outline-none" aria-label={`${p.title} — ${stageLabel(p.stage)}`}>
        <div className="relative overflow-hidden rounded-[22px] ring-1 ring-black/5 transition group-focus-visible:ring-4 group-focus-visible:ring-gold-400/60">
          <SmartImage
            image={p.coverImage}
            alt={p.coverImage?.alt || p.title}
            width={700}
            sizes="(min-width:1024px) 25vw, (min-width:640px) 46vw, 78vw"
            aspect="2/3"
            imgClassName="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/15 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-950 shadow-sm">
            {stageLabel(p.stage)}
          </span>
          {p.hasTrailer && (
            <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition group-hover:bg-white group-hover:text-ink-950">
              <Play className="h-3 w-3 fill-current" aria-hidden /> Trailer
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">{p.category}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-white">{p.title}</h3>
            {when && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-paper-200">
                <CalendarClock className="h-4 w-4 text-gold-300" aria-hidden />
                {when}
              </p>
            )}
          </div>
        </div>
        {p.logline && <p className={cx('mt-3 line-clamp-2 text-sm', dark ? 'text-paper-300' : 'text-ink-600')}>{p.logline}</p>}
      </Link>
    </li>
  );
}

/** Homepage: swipeable row of upcoming productions (anything not yet "Released"). */
export default function ForthcomingSection({ data, content = {}, theme }) {
  const items = data?.items || [];
  const railRef = useRef(null);
  const headingId = `forthcoming-${useId().replace(/:/g, '')}`;
  if (!items.length) return null;

  const t = theme || 'warm';
  const dark = t === 'dark';
  const scroll = (d) => railRef.current?.scrollBy({ left: d * Math.round(railRef.current.clientWidth * 0.8), behavior: 'smooth' });
  const arrow = cx('flex h-11 w-11 items-center justify-center rounded-full border transition', dark ? 'border-white/25 text-paper-50 hover:bg-white hover:text-ink-900' : 'border-ink-900/20 hover:bg-ink-900 hover:text-paper-50');

  return (
    <SectionShell theme={t} labelledBy={headingId}>
      <SectionHeading
        id={headingId}
        dark={dark}
        eyebrow={content.eyebrow || 'On the slate'}
        heading={content.heading || 'Forthcoming projects'}
        intro={content.intro}
        action={
          <div className="flex items-center gap-3">
            {content.showButton !== false && (
              <Button to={content.buttonLink || '/productions?status=forthcoming'} variant={dark ? 'outline-light' : 'outline'} iconRight={ArrowRight}>
                {content.buttonLabel || 'All upcoming'}
              </Button>
            )}
            {items.length > 4 && (
              <div className="hidden gap-2 lg:flex">
                <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className={arrow}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className={arrow}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        }
      />
      <ul ref={railRef} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0" aria-label="Forthcoming projects — swipe to see more">
        {items.map((p) => (
          <ForthcomingCard key={p.id} p={p} dark={dark} />
        ))}
      </ul>
    </SectionShell>
  );
}