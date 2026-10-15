import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { imageUrl } from '../../../../lib/images';
import { usePrefersReducedMotion } from '../../../../hooks/useMediaQuery';
import { cx } from '../../../../lib/format';

/* ───────────────────────── shared helpers ───────────────────────── */

const MIN_ITEMS_PER_SET = 10;

/** Repeat items until one "set" is wider than any screen, so the loop never shows a gap. */
function useLoopSet(items, minCount = MIN_ITEMS_PER_SET) {
  return useMemo(() => {
    if (!items.length) return [];
    const repeats = Math.max(1, Math.ceil(minCount / items.length));
    return Array.from({ length: repeats }, () => items).flat();
  }, [items, minCount]);
}

/** Pause on hover / keyboard focus / touch, plus a manual pause button. */
function usePauseControls(pauseOnHover) {
  const [paused, setPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const timer = useRef(null);
  const handlers = {
    onMouseEnter: () => pauseOnHover && setPaused(true),
    onMouseLeave: () => pauseOnHover && setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: (e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false),
    onTouchStart: () => {
      clearTimeout(timer.current);
      setTouchPaused(true);
    },
    onTouchEnd: () => {
      timer.current = setTimeout(() => setTouchPaused(false), 2500);
    },
  };
  return { paused, setPaused, isPaused: paused || touchPaused, handlers };
}

function ItemLink({ item, decorative, className, children }) {
  if (!item.link?.href) return children;
  const props = { className, tabIndex: decorative ? -1 : undefined, 'aria-label': decorative ? undefined : item.caption || 'View' };
  return item.link.href.startsWith('/') ? (
    <Link to={item.link.href} {...props}>
      {children}
    </Link>
  ) : (
    <a href={item.link.href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function PauseButton({ paused, onToggle, label = 'image ticker', className }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-paper-100 transition hover:bg-white hover:text-ink-900',
        className,
      )}
      aria-label={paused ? `Play ${label}` : `Pause ${label}`}
      aria-pressed={paused}
    >
      {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
    </button>
  );
}

/* ───────────────────────── SHOWCASE style ─────────────────────────
   Tall rounded portrait cards in staggered heights + a moving text ribbon.
   Designed to sit directly under the hero video. */

const SHOWCASE_HEIGHTS = {
  sm: ['h-[220px] sm:h-[300px]', 'h-[270px] sm:h-[370px]', 'h-[200px] sm:h-[270px]', 'h-[250px] sm:h-[340px]'],
  md: ['h-[260px] sm:h-[380px]', 'h-[330px] sm:h-[470px]', 'h-[240px] sm:h-[340px]', 'h-[300px] sm:h-[420px]'],
  lg: ['h-[300px] sm:h-[440px]', 'h-[380px] sm:h-[540px]', 'h-[280px] sm:h-[400px]', 'h-[340px] sm:h-[490px]'],
};
const SHOWCASE_MAX = { sm: 'h-[270px] sm:h-[370px]', md: 'h-[330px] sm:h-[470px]', lg: 'h-[380px] sm:h-[540px]' };

const DEFAULT_WORDS = ['Feature Films', 'Commercials', 'Documentaries', 'Music Videos', 'Post-Production', 'Royal Bee Film Studios'];

function ShowcaseCard({ item, index, decorative, size }) {
  const heights = SHOWCASE_HEIGHTS[size] || SHOWCASE_HEIGHTS.md;
  return (
    <li className="flex shrink-0 items-end">
      <ItemLink item={item} decorative={decorative} className="block rounded-[22px]">
        <figure className={cx('group relative aspect-[3/4] overflow-hidden rounded-[22px] bg-ink-800 sm:rounded-[28px]', heights[index % heights.length])}>
          <img
            src={imageUrl(item.image, 700)}
            alt={decorative ? '' : item.image?.alt || item.caption || ''}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {item.caption && (
            <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink-950/85 to-transparent p-4 text-sm font-medium text-paper-50 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {item.caption}
            </figcaption>
          )}
        </figure>
      </ItemLink>
    </li>
  );
}

function TextRibbon({ words, durationSeconds, direction, paused, reducedMotion }) {
  const list = useLoopSet(words, 8);
  const animation = direction === 'right' ? 'ticker-reverse' : 'ticker';

  const Row = ({ hidden }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {list.map((w, i) => (
        <li key={`${hidden ? 'b' : 'a'}-${w}-${i}`} className="flex items-center">
          <span
            className={cx(
              'whitespace-nowrap px-4 font-sans text-xl font-extrabold uppercase tracking-tight sm:px-6 sm:text-3xl lg:text-4xl', 
              i % 2 === 0 ? 'text-paper-50' : 'text-paper-50/30',
            )}
          >
            {w}
          </span>
                    <span className="text-base text-gold-500 sm:text-2xl" aria-hidden>
            ★
          </span>
        </li>
      ))}
    </ul>
  );

  if (reducedMotion) {
    return (
      <div className="no-scrollbar overflow-x-auto">
        <Row />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" aria-label={words.join(', ')} role="marquee">
      <div
        className="flex w-max"
        style={{ animation: `${animation} ${durationSeconds}s linear infinite`, animationPlayState: paused ? 'paused' : 'running', willChange: 'transform' }}
      >
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}

function ShowcaseTicker({ items, settings, content, reducedMotion }) {
  const set = useLoopSet(items);
  const { paused, setPaused, isPaused, handlers } = usePauseControls(settings.pauseOnHover !== false);
  const size = settings.imageHeight || 'md';
  const duration = Math.max(10, settings.speedSeconds || 60) * (set.length / Math.max(items.length, 1));
  const animation = settings.direction === 'right' ? 'ticker-reverse' : 'ticker';
  const words = (content.marqueeText || []).filter(Boolean).length ? content.marqueeText.filter(Boolean) : DEFAULT_WORDS;
  const showText = content.showText !== false;
  // The text ribbon moves the opposite way to the images for a layered, cinematic feel.
  const textDirection = settings.direction === 'right' ? 'left' : 'right';

  return (
    <section aria-label={content.heading || 'Studio moments'} className="relative overflow-hidden bg-ink-950 pb-12 pt-10 sm:pb-16 sm:pt-14">
      {reducedMotion ? (
        <ul className={cx('no-scrollbar flex snap-x items-end gap-3 overflow-x-auto px-4 sm:gap-5 sm:px-10', SHOWCASE_MAX[size])}>
          {items.map((item, i) => (
            <ShowcaseCard key={item.id} item={item} index={i} size={size} decorative={false} />
          ))}
        </ul>
      ) : (
        <div className="relative" {...handlers}>
          <div
            className={cx('flex w-max items-end', SHOWCASE_MAX[size])}
            style={{ animation: `${animation} ${duration}s linear infinite`, animationPlayState: isPaused ? 'paused' : 'running', willChange: 'transform' }}
          >
            <ul className="flex h-full items-end gap-3 pr-3 sm:gap-5 sm:pr-5">
              {set.map((item, i) => (
                <ShowcaseCard key={`a-${item.id}-${i}`} item={item} index={i} size={size} decorative={i >= items.length} />
              ))}
            </ul>
            <ul className="flex h-full items-end gap-3 pr-3 sm:gap-5 sm:pr-5" aria-hidden>
              {set.map((item, i) => (
                <ShowcaseCard key={`b-${item.id}-${i}`} item={item} index={i} size={size} decorative />
              ))}
            </ul>
          </div>
        </div>
      )}

      {showText && (
                <div className="mt-8 border-y border-white/10 py-4 sm:mt-12 sm:py-5">
          <TextRibbon words={words} durationSeconds={Math.max(10, content.textSpeedSeconds || 40)} direction={textDirection} paused={isPaused} reducedMotion={reducedMotion} />
        </div>
      )}

      {!reducedMotion && <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} className="absolute bottom-3 right-3 h-9 w-9 bg-ink-950/60 backdrop-blur sm:bottom-5 sm:right-6" />}
    </section>
  );
}

/* ───────────────────────── STRIP style (rounded card) ───────────────────────── */

const STRIP_HEIGHTS = { sm: 'h-[180px] sm:h-[220px]', md: 'h-[220px] sm:h-[300px]', lg: 'h-[260px] sm:h-[380px]' };
const WIDTH_PATTERN = ['aspect-[4/5]', 'aspect-[16/10]', 'aspect-square', 'aspect-[3/2]', 'aspect-[4/5]', 'aspect-[16/9]'];

function StripItem({ item, index, decorative, className = 'h-full' }) {
  return (
    <li className={className}>
      <ItemLink item={item} decorative={decorative} className="block h-full rounded-2xl">
        <figure className={cx('group relative h-full shrink-0 overflow-hidden rounded-2xl bg-ink-800', WIDTH_PATTERN[index % WIDTH_PATTERN.length])}>
          <img
            src={imageUrl(item.image, 700)}
            alt={decorative ? '' : item.image?.alt || item.caption || ''}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {item.caption && (
            <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink-950/85 to-transparent p-4 text-sm font-medium text-paper-50 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {item.caption}
            </figcaption>
          )}
        </figure>
      </ItemLink>
    </li>
  );
}

function StripTicker({ items, settings, content, reducedMotion }) {
  const set = useLoopSet(items);
  const { paused, setPaused, isPaused, handlers } = usePauseControls(settings.pauseOnHover !== false);
  const duration = Math.max(10, settings.speedSeconds || 60) * (set.length / Math.max(items.length, 1));
  const animation = settings.direction === 'right' ? 'ticker-reverse' : 'ticker';
  const height = STRIP_HEIGHTS[settings.imageHeight] || STRIP_HEIGHTS.md;

  return (
    <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section
        aria-labelledby={content.heading ? 'ticker-heading' : undefined}
        aria-label={content.heading ? undefined : 'Studio moments'}
        className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 py-14 sm:rounded-[40px] sm:py-20"
      >
        {(content.eyebrow || content.heading) && (
          <div className="container-site mb-10 flex items-end justify-between gap-6">
            <div>
              {content.eyebrow && <p className="eyebrow eyebrow-light mb-4">{content.eyebrow}</p>}
              {content.heading && (
                <h2 id="ticker-heading" className="heading-md text-paper-50">
                  {content.heading}
                </h2>
              )}
            </div>
            {!reducedMotion && <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} />}
          </div>
        )}

        {reducedMotion ? (
          <ul className={cx('no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 sm:px-10', height)}>
            {items.map((item, i) => (
              <StripItem key={item.id} item={item} index={i} decorative={false} className="h-full snap-start" />
            ))}
          </ul>
        ) : (
          <div className="relative" {...handlers}>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent sm:w-32" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent sm:w-32" aria-hidden />
            <div className={cx('flex w-max', height)} style={{ animation: `${animation} ${duration}s linear infinite`, animationPlayState: isPaused ? 'paused' : 'running', willChange: 'transform' }}>
              <ul className="flex h-full gap-4 pr-4">
                {set.map((item, i) => (
                  <StripItem key={`a-${item.id}-${i}`} item={item} index={i} decorative={i >= items.length} />
                ))}
              </ul>
              <ul className="flex h-full gap-4 pr-4" aria-hidden>
                {set.map((item, i) => (
                  <StripItem key={`b-${item.id}-${i}`} item={item} index={i} decorative />
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────────────────── Section entry ───────────────────────── */

/**
 * Continuous moving image ticker.
 * - content.style = 'showcase' (default): tall staggered portrait cards + text ribbon (use right after the hero)
 * - content.style = 'strip': rounded card with heading and a mixed-size image strip
 * Images, order, visibility, links and speed come from Admin → Website → Image ticker.
 * Seamless loop: the duplicate copy is aria-hidden and unfocusable. Pauses on hover,
 * focus, touch or the pause button. Reduced motion → static swipeable row.
 */
export default function TickerSection({ data, content = {} }) {
  const settings = data?.settings || {};
  const items = data?.items || [];
  const reducedMotion = usePrefersReducedMotion();
  if (!items.length || settings.enabled === false) return null;

  const props = { items, settings, content, reducedMotion };
  return content.style === 'strip' ? <StripTicker {...props} /> : <ShowcaseTicker {...props} />;
}