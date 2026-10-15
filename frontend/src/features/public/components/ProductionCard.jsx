import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import SmartImage from '../../../components/media/SmartImage';
import SampleBadge from '../../../components/media/SampleBadge';
import { cx } from '../../../lib/format';

/** Portfolio card — cinematic 16:10 still with title overlay. */
export default function ProductionCard({ production, size = 'md', className, dark }) {
  const p = production;
  return (
    <Link to={`/productions/${p.slug}`} className={cx('group block', className)} aria-label={`${p.title} — ${p.category}`}>
      <div className="relative overflow-hidden rounded-2xl">
        <SmartImage
          image={p.coverImage}
          alt={p.coverImage?.alt || p.title}
          width={size === 'lg' ? 1600 : 900}
          sizes={size === 'lg' ? '(min-width:1024px) 60vw, 100vw' : '(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw'}
          aspect={size === 'lg' ? '16/10' : '4/3'}
          imgClassName="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent opacity-90" aria-hidden />
        <div className="absolute left-4 top-4 flex gap-2">
          <SampleBadge show={p.isPlaceholder} />
        </div>
        {p.hasTrailer && (
          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-gold-500 group-hover:text-ink-950">
            <Play className="h-4 w-4 fill-current" aria-hidden />
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">
            {p.category}
            {p.year ? ` · ${p.year}` : ''}
          </p>
          <h3 className={cx('mt-2 font-display font-semibold leading-tight text-white', size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl')}>{p.title}</h3>
          {size === 'lg' && p.logline && <p className="mt-2 line-clamp-2 max-w-xl text-sm text-paper-200/85">{p.logline}</p>}
        </div>
      </div>
      {size === 'sm' && p.logline && <p className={cx('mt-3 line-clamp-2 text-sm', dark ? 'text-paper-300' : 'text-ink-600')}>{p.logline}</p>}
    </Link>
  );
}
