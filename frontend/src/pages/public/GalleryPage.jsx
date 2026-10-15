import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../../components/public/Seo';
import Lightbox from '../../components/media/Lightbox';
import PageHero from '../../features/public/components/PageHero';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useGallery } from '../../features/public/publicApi';
import { imageSrcSet, imageUrl } from '../../lib/images';
import { cx, titleCase } from '../../lib/format';

export default function GalleryPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const { data, isLoading, error, refetch } = useGallery(category || undefined);
  const [index, setIndex] = useState(null);

  const items = data?.data || [];
  const categories = data?.meta?.categories || [];

  return (
    <>
      <Seo title="Gallery" description="Moments from our sets, studio and productions." />
      <PageHero eyebrow="Gallery" title="Moments from our sets" breadcrumbs={[{ label: 'Gallery' }]} />
      <section className="bg-paper-100 pb-24">
        <div className="container-site">
          <div role="group" aria-label="Filter photos" className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
            {['', ...categories].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                aria-pressed={category === c}
                onClick={() => setParams(c ? { category: c } : {})}
                className={cx('shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition', category === c ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
              >
                {c ? titleCase(c) : 'All'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <PublicLoading />
          ) : error ? (
            <PublicError error={error} onRetry={refetch} />
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-ink-600">No photos here yet.</p>
          ) : (
            <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
              {items.map((img, i) => (
                <li key={img.id} className="break-inside-avoid">
                  <figure>
                    <button type="button" onClick={() => setIndex(i)} className="group block w-full overflow-hidden rounded-2xl bg-paper-200" aria-label={`Open photo${img.caption ? `: ${img.caption}` : ''}`}>
                      <img
                        src={imageUrl(img.image, 900)}
                        srcSet={imageSrcSet(img.image, [480, 768, 1080])}
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        alt={img.image?.alt || img.caption || ''}
                        loading="lazy"
                        className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </button>
                    {(img.caption || img.production) && (
                      <figcaption className="mt-2.5 text-sm text-ink-600">
                        {img.caption}
                        {img.production && (
                          <>
                            {' · '}
                            <Link to={`/productions/${img.production.slug}`} className="font-semibold text-ink-900 underline-offset-4 hover:underline">
                              {img.production.title}
                            </Link>
                          </>
                        )}
                      </figcaption>
                    )}
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <Lightbox items={items} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </>
  );
}
