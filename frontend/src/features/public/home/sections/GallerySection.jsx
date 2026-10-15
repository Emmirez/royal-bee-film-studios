import { useState } from 'react';
import { ArrowRight, Expand } from 'lucide-react';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import SmartImage from '../../../../components/media/SmartImage';
import Lightbox from '../../../../components/media/Lightbox';
import Button from '../../../../components/ui/Button';
import { cx } from '../../../../lib/format';

// Mosaic layout for up to 6 photos (phone: 2 columns, desktop: 4 columns)
const TILE_CLASSES = [
  'col-span-2 lg:row-span-2', // large feature photo
  '',
  '',
  'lg:col-span-2',
  'lg:col-span-2',
  'col-span-2',
];

/** Homepage photo gallery — 6 published Studio gallery photos with a lightbox. */
export default function GallerySection({ data, content = {}, theme }) {
    // Photos added directly on the homepage section come first; otherwise use the Studio gallery
  const ownPhotos = (content.images || [])
    .filter((p) => p?.image?.url)
    .map((p, i) => ({ id: `home-gallery-${i}`, image: p.image, caption: p.caption || '' }));
  const items = (ownPhotos.length ? ownPhotos : data?.items || []).slice(0, 6);
  const [index, setIndex] = useState(null);
  if (!items.length) return null;

  return (
    <SectionShell theme={theme || 'white'} labelledBy="home-gallery-heading">
      <SectionHeading
        id="home-gallery-heading"
        eyebrow={content.eyebrow || 'Gallery'}
        heading={content.heading || 'Moments from our sets'}
        intro={content.intro}
            action={
          content.showButton !== false && (
            <Button to={content.buttonLink || '/gallery'} variant="outline" iconRight={ArrowRight}>
              {content.buttonLabel || 'View full gallery'}
            </Button>
          )
        }
      />

      <ul className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 lg:auto-rows-[220px] lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id} className={cx('min-w-0', TILE_CLASSES[i])}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block h-full w-full overflow-hidden rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 sm:rounded-[24px]"
              aria-label={`Open photo ${i + 1} of ${items.length}${item.caption ? `: ${item.caption}` : ''}`}
            >
              <SmartImage
                image={item.image}
                width={i === 0 ? 1200 : 800}
                sizes={i === 0 ? '(min-width:1024px) 50vw, 100vw' : '(min-width:1024px) 25vw, 50vw'}
                className="h-full w-full"
                imgClassName="transition duration-700 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
              <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper-50/90 text-ink-900 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                <Expand className="h-4 w-4" />
              </span>
              {item.caption && (
                <span className="pointer-events-none absolute inset-x-4 bottom-3 truncate text-left text-sm font-medium text-paper-50 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {item.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Lightbox items={items} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </SectionShell>
  );
}