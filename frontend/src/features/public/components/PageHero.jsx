import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { imageUrl } from '../../../lib/images';
import { cx } from '../../../lib/format';

/**
 * Header band for inner public pages. With an image it becomes a dark,
 * cinematic banner; without, a quiet off-white title block.
 */
export default function PageHero({ eyebrow, title, intro, image, breadcrumbs = [], children, align = 'left' }) {
  const bg = imageUrl(image, 1920);
  const dark = Boolean(bg);
  return (
    <header className={cx('relative isolate overflow-hidden', dark ? 'bg-ink-950 text-paper-50' : 'bg-paper-100 text-ink-900')}>
      {bg && (
        <>
          <img src={bg} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/30" aria-hidden />
        </>
      )}
      <div className={cx('container-site pb-14 sm:pb-20', dark ? 'pt-40 sm:pt-52' : 'pt-32 sm:pt-40', align === 'center' && 'text-center')}>
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className={cx('flex flex-wrap items-center gap-1.5 text-xs font-medium', dark ? 'text-paper-300' : 'text-ink-500', align === 'center' && 'justify-center')}>
              <li>
                <Link to="/" className="hover:underline">
                  Home
                </Link>
              </li>
              {breadcrumbs.map((b) => (
                <li key={b.label} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" aria-hidden />
                  {b.to ? (
                    <Link to={b.to} className="hover:underline">
                      {b.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{b.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className={cx('eyebrow mb-5', dark && 'eyebrow-light', align === 'center' && 'justify-center')}>{eyebrow}</p>}
        <h1 className={cx('heading-xl max-w-4xl text-balance', align === 'center' && 'mx-auto')}>{title}</h1>
        {intro && <p className={cx('mt-6 max-w-2xl text-lg leading-relaxed', dark ? 'text-paper-200/90' : 'text-ink-600', align === 'center' && 'mx-auto')}>{intro}</p>}
        {children}
      </div>
    </header>
  );
}
