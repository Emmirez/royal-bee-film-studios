import { useSearchParams } from 'react-router-dom';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import PageHero from '../../features/public/components/PageHero';
import ProductionCard from '../../features/public/components/ProductionCard';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useProductions } from '../../features/public/publicApi';
import { cx } from '../../lib/format';

export default function ProductionsPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch, isFetching } = useProductions({ category: category || undefined, page, limit: 12 });

  const setCategory = (c) => {
    const next = new URLSearchParams();
    if (c) next.set('category', c);
    setParams(next);
  };

  const items = data?.data || [];
  const meta = data?.meta;
  const categories = meta?.categories || [];

  return (
    <>
      <Seo title="Productions" description="Selected films, commercials, documentaries and music videos." />
      <PageHero eyebrow="Our work" title="Productions" intro="A selection of the stories we’ve brought to the screen." breadcrumbs={[{ label: 'Productions' }]} />

      <section className="bg-paper-100 pb-24">
        <div className="container-site">
          {categories.length > 1 && (
            <div role="group" aria-label="Filter by category" className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
              {['', ...categories].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cx(
                    'shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition',
                    category === c ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900',
                  )}
                >
                  {c || 'All work'}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <PublicLoading />
          ) : error ? (
            <PublicError error={error} onRetry={refetch} />
          ) : items.length === 0 ? (
            <p className="py-24 text-center text-ink-600">No productions in this category yet.</p>
          ) : (
            <div className={cx('grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 transition-opacity', isFetching && 'opacity-60')}>
              {items.map((p) => (
                <ProductionCard key={p.id} production={p} size="sm" />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setParams({ ...(category && { category }), page: String(page - 1) })}>
                Previous
              </Button>
              <span className="px-3 text-sm tabular text-ink-600">
                {page} / {meta.totalPages}
              </span>
              <Button variant="outline" disabled={page >= meta.totalPages} onClick={() => setParams({ ...(category && { category }), page: String(page + 1) })}>
                Next
              </Button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
