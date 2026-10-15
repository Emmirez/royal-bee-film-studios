import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { cx } from '../../lib/format';

/**
 * Full-screen public search with autocomplete. Results come only from
 * published public content (services, productions, news).
 */
export default function SearchOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popular, setPopular] = useState([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    setSuggestions([]);
    setActive(-1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => inputRef.current?.focus(), 30);
    api.get('/public/search/popular').then((r) => setPopular(r.data || [])).catch(() => {});
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api
        .get('/public/search/suggest', { query: { q: q.trim() }, signal: ctrl.signal })
        .then((r) => {
          setSuggestions(r.data || []);
          setActive(-1);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (!open) return null;

  const go = (href) => {
    onClose();
    navigate(href);
  };
  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return go(suggestions[active].href);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    return undefined;
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-[80] animate-fade-in bg-paper-100/97 backdrop-blur-md">
      <div className="container-site pt-6 sm:pt-16">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full p-2.5 text-ink-700 hover:bg-paper-200" aria-label="Close search">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={submit} className="mx-auto mt-4 max-w-3xl" role="search">
          <label htmlFor="site-search" className="eyebrow mb-4">
            Search the studio
          </label>
          <div className="flex items-center gap-3 border-b-2 border-ink-900 pb-3">
            <Search className="h-6 w-6 text-ink-500" aria-hidden />
            <input
              id="site-search"
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(suggestions.length - 1, a + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(-1, a - 1));
                }
              }}
              placeholder="Productions, services, news…"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="search-suggestions"
              aria-activedescendant={active >= 0 ? `sugg-${active}` : undefined}
              className="w-full bg-transparent font-display text-3xl text-ink-900 placeholder:text-ink-400 focus:outline-none sm:text-5xl"
            />
          </div>

          {suggestions.length > 0 ? (
            <ul id="search-suggestions" role="listbox" className="mt-6 divide-y divide-paper-300">
              {suggestions.map((s, i) => (
                <li key={s.href} id={`sugg-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s.href)}
                    className={cx('flex w-full items-center justify-between gap-4 rounded-lg px-3 py-4 text-left', i === active && 'bg-paper-200')}
                  >
                    <span>
                      <span className="block text-lg font-semibold text-ink-900">{s.label}</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">{s.type}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 text-ink-400" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button type="submit" className="px-3 py-4 text-sm font-semibold text-ink-700 underline-offset-4 hover:underline">
                  See all results for “{q}”
                </button>
              </li>
            </ul>
          ) : (
            popular.length > 0 &&
            q.length < 2 && (
              <div className="mt-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => go(`/search?q=${encodeURIComponent(term)}`)}
                      className="rounded-full border border-paper-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-900"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
