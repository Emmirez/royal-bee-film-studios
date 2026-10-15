import { useSearchParams } from 'react-router-dom';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import PageHero from '../../features/public/components/PageHero';
import NewsCard from '../../features/public/components/NewsCard';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useNewsList } from '../../features/public/publicApi';
import { cx } from '../../lib/format';

export default function NewsPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch } = useNewsList({ category: category || undefined, page });
  const items = data?.data || [];
  const meta = data?.meta;

  return (
    <>
      <Seo title="News" description="News and announcements from Royal Bee Film Studios." />
      <PageHero eyebrow="Studio news" title="News & announcements" breadcrumbs={[{ label: 'News' }]} />
      <section className="bg-paper-100 pb-24">
        <div className="container-site">
          {meta?.categories?.length > 1 && (
            <div role="group" aria-label="Filter by category" className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
              {['', ...meta.categories].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setParams(c ? { category: c } : {})}
                  className={cx('shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition', category === c ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
                >
                  {c || 'All'}
                </button>
              ))}
            </div>
          )}
          {isLoading ? (
            <PublicLoading />
          ) : error ? (
            <PublicError error={error} onRetry={refetch} />
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-ink-600">No news yet — check back soon.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setParams({ ...(category && { category }), page: String(page - 1) })}>
                Newer
              </Button>
              <Button variant="outline" disabled={page >= meta.totalPages} onClick={() => setParams({ ...(category && { category }), page: String(page + 1) })}>
                Older
              </Button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
