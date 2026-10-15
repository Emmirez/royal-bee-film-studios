import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format';

/**
 * Studio logo: the logo image (/logo.png or the one set in CMS settings)
 * followed by a styled "Royal Bee — Film Studios" wordmark.
 * light  → for dark backgrounds (hero, footer)
 * tone="app" → follows the staff workspace light/dark theme
 * compact → smaller version for tight spaces (e.g. the admin header on phones)
 */
export default function Logo({ src = '/logo.png', light = false, tone, className, showWordmark = true, compact = false }) {
  const [failed, setFailed] = useState(false);
  const app = tone === 'app';
  const text = app ? 'text-app-text' : light ? 'text-paper-50' : 'text-ink-900';
  const accent = app ? 'text-app-accent' : light ? 'text-gold-300' : 'text-gold-700';
  const rule = app ? 'bg-app-accent/50' : light ? 'bg-gold-300/60' : 'bg-gold-600/60';
  const divider = app ? 'bg-app-border' : light ? 'bg-white/25' : 'bg-ink-900/15';

  return (
    <Link to="/" className={cx('group inline-flex min-w-0 shrink-0 items-center', compact ? 'gap-2' : 'gap-2.5 sm:gap-3', className)} aria-label="Royal Bee Film Studios — home">
      {!failed && (
        <img
          src={src}
          alt=""
          className={cx('w-auto max-w-[140px] shrink-0 object-contain transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105', compact ? 'h-8' : 'h-10 sm:h-11')}
          onError={() => setFailed(true)}
        />
      )}

      {(showWordmark || failed) && (
        <>
          {!failed && !compact && <span className={cx('hidden h-9 w-px sm:block', divider)} aria-hidden />}
                    <span className={cx('min-w-0 flex-col whitespace-nowrap leading-none', compact ? 'hidden min-[360px]:flex' : 'flex', text)}>
            <span className={cx('font-display font-bold tracking-[0.01em]', compact ? 'text-[1.3rem]' : 'text-[1.45rem] sm:text-[1.6rem]')}>
              Royal <span className={cx('italic', accent)}>Bee</span>
            </span>
              <span className={cx('mt-1 flex items-center font-semibold uppercase', compact ? 'gap-1 text-[7.5px] tracking-[0.22em]' : 'gap-1.5 text-[8.5px] tracking-[0.38em] sm:text-[9px]', accent)}>
              <span className={cx('h-px', compact ? 'w-2' : 'w-3', rule)} aria-hidden />
              Film Studios
              <span className={cx('h-px', compact ? 'w-2' : 'w-3', rule)} aria-hidden />
            </span>
          </span>
        </>
      )}
    </Link>
  );
}