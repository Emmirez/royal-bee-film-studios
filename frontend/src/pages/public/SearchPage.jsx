import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import Seo from '../../components/public/Seo';
import ProductionCard from '../../features/public/components/ProductionCard';
import NewsCard from '../../features/public/components/NewsCard';
import { PublicLoading } from '../../features/public/components/PublicStates';
import { api, getData } from '../../lib/api';
import { cx } from '../../lib/format';

const TYPES = [
  { value: 'all', label: 'Everything' },
  { value: 'productions', label: 'Productions' },
  { value: 'services', label: 'Services' },
  { value: 'news', label: 'News' },
];

/** Dedicated public search: categorized results, type filter, sorting, empty states. */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || 'all';
  const sort = params.get('sort') || 'relevance';
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public', 'search', q, type, sort],
    queryFn: () => getData('/public/search', { query: { q, type, sort, limit: 12 } }),
    enabled: q.length > 0,
  });
  const { data: popular = [] } = useQuery({ queryKey: ['public', 'search-popular'], queryFn: () => getData('/public/search/popular') });

  const update = (next) => setParams({ q, type, sort, ...next });
  const r = data?.results;

  return (
    <>
      <Seo title={q ? `Search: ${q}` : 'Search'} noIndex />
      <section className="bg-paper-100 pb-24 pt-32 sm:pt-40">
        <div className="container-site">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) update({ q: input.trim() });
            }}
            className="mx-auto max-w-3xl"
          >
            <label htmlFor="search-page-input" className="eyebrow mb-4">
              Search
            </label>
            <div className="flex items-center gap-3 border-b-2 border-ink-900 pb-3">
              <Search className="h-6 w-6 text-ink-500" aria-hidden />
              <input
                id="search-page-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search productions, services, news…"
                className="w-full bg-transparent font-display text-3xl text-ink-900 placeholder:text-ink-400 focus:outline-none sm:text-4xl"
              />
              <button type="submit" className="rounded-full bg-ink-900 p-3 text-paper-100" aria-label="Search">
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          {q && (
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4">
              <div role="group" aria-label="Result type" className="no-scrollbar flex gap-2 overflow-x-auto">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={type === t.value}
                    onClick={() => update({ type: t.value })}
                    className={cx('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', type === t.value ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-500">Sort</span>
                {['relevance', 'newest'].map((s) => (
                  <button key={s} type="button" aria-pressed={sort === s} onClick={() => update({ sort: s })} className={cx('rounded-full px-3 py-1.5 font-semibold capitalize', sort === s ? 'bg-paper-300 text-ink-900' : 'text-ink-600')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={cx('mt-14 transition-opacity', isFetching && 'opacity-60')} aria-live="polite">
            {!q ? (
              popular.length > 0 && (
                <div className="mx-auto max-w-3xl">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {popular.map((term) => (
                      <button key={term} type="button" onClick={() => update({ q: term })} className="rounded-full border border-paper-400 px-4 py-2 text-sm hover:border-ink-900">
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : isLoading ? (
              <PublicLoading />
            ) : data?.total === 0 ? (
              <div className="mx-auto max-w-xl py-10 text-center">
                <h2 className="heading-md">No results for “{q}”</h2>
                <p className="mt-3 text-ink-600">Try a different word, or browse our <Link to="/productions" className="underline">productions</Link> and <Link to="/services" className="underline">services</Link>.</p>
              </div>
            ) : (
              <div className="space-y-16">
                <p className="text-sm text-ink-500">
                  {data?.total} result{data?.total === 1 ? '' : 's'} for “{q}”
                </p>
                {r?.productions?.length > 0 && (
                  <div>
                    <h2 className="eyebrow mb-6">Productions</h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {r.productions.map((p) => (
                        <ProductionCard key={p.id} production={p} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
                {r?.services?.length > 0 && (
                  <div>
                    <h2 className="eyebrow mb-6">Services</h2>
                    <ul className="divide-y divide-paper-300 border-y border-paper-300">
                      {r.services.map((s) => (
                        <li key={s.id}>
                          <Link to={s.href} className="flex items-center justify-between gap-4 py-5">
                            <span>
                              <span className="block font-display text-2xl font-semibold">{s.title}</span>
                              <span className="text-sm text-ink-600">{s.summary}</span>
                            </span>
                            <ArrowRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r?.news?.length > 0 && (
                  <div>
                    <h2 className="eyebrow mb-6">News</h2>
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                      {r.news.map((n) => (
                        <NewsCard key={n.id} post={n} />
                      ))}
                    </div>
                  </div>
                )}
                {r?.founder?.length > 0 && (
                  <div>
                    <h2 className="eyebrow mb-6">About</h2>
                    <Link to="/about/founder" className="inline-flex items-center gap-3 rounded-2xl border border-paper-300 bg-paper-50 px-6 py-5">
                      <span className="font-display text-2xl font-semibold">{r.founder[0].name}</span>
                      <span className="text-sm text-ink-500">{r.founder[0].title}</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// Re-export for prefetch use elsewhere
export const prefetchSearch = (q) => api.get('/public/search', { query: { q } });
