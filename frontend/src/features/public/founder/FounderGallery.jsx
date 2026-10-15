import { useMemo, useState } from 'react';
import { Expand } from 'lucide-react';
import Lightbox from '../../../components/media/Lightbox';
import { imageUrl, imageSrcSet } from '../../../lib/images';
import { cx, titleCase } from '../../../lib/format';

/**
 * Responsive founder photo gallery (masonry columns) with category filter
 * and an accessible lightbox (next/previous, captions, keyboard + swipe).
 */
export default function FounderGallery({ images = [] }) {
  const [category, setCategory] = useState('all');
  const [index, setIndex] = useState(null);

  const categories = useMemo(() => ['all', ...new Set(images.map((i) => i.category).filter(Boolean))], [images]);
  const visible = category === 'all' ? images : images.filter((i) => i.category === category);
  if (!images.length) return null;

  return (
    <div>
      {categories.length > 2 && (
        <div role="group" aria-label="Filter photos" className="no-scrollbar mb-8 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cx(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
                category === c ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900',
              )}
            >
              {c === 'all' ? 'All photos' : titleCase(c)}
            </button>
          ))}
        </div>
      )}

      <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
        {visible.map((img, i) => (
          <li key={img.id} className="break-inside-avoid">
            <figure>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block w-full overflow-hidden rounded-2xl bg-paper-200"
                aria-label={`Open photo${img.caption ? `: ${img.caption}` : ` ${i + 1}`}`}
              >
                <img
                  src={imageUrl(img.image, 900)}
                  srcSet={imageSrcSet(img.image, [480, 768, 1080])}
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  alt={img.image?.alt || img.caption || ''}
                  loading="lazy"
                  decoding="async"
                  className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                  <Expand className="h-4 w-4" />
                </span>
              </button>
              {img.caption && <figcaption className="mt-2.5 text-sm text-ink-600">{img.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <Lightbox items={visible} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </div>
  );
}
