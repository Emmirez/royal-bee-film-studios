import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FileText, Film, Layers, Newspaper, Plus, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { visibleNav } from '../../features/admin/adminNav';
import { api } from '../../lib/api';
import { P } from '../../lib/permissions';
import { cx } from '../../lib/format';

/**
 * Global command launcher (Ctrl/⌘ K or the search button).
 * Only shows destinations and actions the user is permitted to use; record
 * search goes through the same permission-checked API as the rest of the app.
 */
export default function CommandMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [records, setRecords] = useState([]);
  const inputRef = useRef(null);

  const actions = useMemo(() => {
    const list = [];
    if (can(P.CMS_EDIT)) {
      list.push({ label: 'New production', icon: Plus, to: '/admin/website/productions/new', group: 'Actions' });
      list.push({ label: 'New news article', icon: Plus, to: '/admin/website/news/new', group: 'Actions' });
      list.push({ label: 'New service', icon: Plus, to: '/admin/website/services/new', group: 'Actions' });
    }
    if (can(P.USERS_MANAGE)) list.push({ label: 'Invite staff member', icon: UserPlus, to: '/admin/staff?invite=1', group: 'Actions' });
    visibleNav(can).forEach((g) => g.items.forEach((i) => list.push({ label: i.label, icon: i.icon, to: i.to, group: 'Go to' })));
    list.push({ label: 'My account & security', icon: FileText, to: '/admin/security', group: 'Go to' });
    list.push({ label: 'View public website', icon: FileText, href: '/', group: 'Go to' });
    return list;
  }, [can]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    setRecords([]);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  // Record search (permission-checked by the API)
  useEffect(() => {
    if (!open || q.trim().length < 2 || !can(P.CMS_VIEW)) {
      setRecords([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const sources = [
        { path: '/cms/productions', icon: Film, base: '/admin/website/productions', type: 'Production' },
        { path: '/cms/services', icon: Layers, base: '/admin/website/services', type: 'Service' },
        { path: '/cms/news', icon: Newspaper, base: '/admin/website/news', type: 'News' },
      ];
      const results = await Promise.all(
        sources.map((s) =>
          api
            .get(s.path, { query: { q: q.trim(), limit: 4 }, signal: ctrl.signal })
            .then((r) => r.data.map((d) => ({ label: d.title, icon: s.icon, to: `${s.base}/${d._id}`, group: 'Records', hint: `${s.type} · ${d.status}` })))
            .catch(() => []),
        ),
      );
      setRecords(results.flat());
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open, can]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const base = n ? actions.filter((a) => a.label.toLowerCase().includes(n)) : actions;
    return [...base, ...records];
  }, [q, actions, records]);

  if (!open) return null;

  const run = (item) => {
    onClose();
    if (item.href) window.open(item.href, '_blank', 'noopener');
    else navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  let lastGroup = null;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[10vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Command menu" className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-app-border bg-app-surface text-app-text shadow-lift">
        <div className="flex items-center gap-3 border-b border-app-border px-4">
          <Search className="h-5 w-5 text-app-subtle" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, actions and records…"
            className="h-14 w-full bg-transparent text-[15px] focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={filtered[active] ? `cmd-${active}` : undefined}
          />
          <kbd className="hidden rounded-md border border-app-border px-1.5 py-0.5 text-[10px] text-app-subtle sm:block">ESC</kbd>
        </div>
        <ul id="command-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 && <li className="px-4 py-8 text-center text-sm text-app-subtle">No matches</li>}
          {filtered.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={`${item.group}-${item.label}-${i}`} role="presentation">
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-subtle">{header}</p>}
                <button
                  id={`cmd-${i}`}
                  role="option"
                  aria-selected={i === active}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === active && 'bg-app-muted')}
                >
                  <Icon className="h-4 w-4 text-app-subtle" aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="text-xs text-app-subtle">{item.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-app-subtle" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
