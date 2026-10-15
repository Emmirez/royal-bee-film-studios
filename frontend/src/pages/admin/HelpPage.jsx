import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, ChevronDown, Compass, Globe, Inbox, Lightbulb, Search, ShieldCheck, Sparkles, Briefcase, X } from 'lucide-react';
import Input from '../../components/ui/Input';
import { EmptyState, PageHeader } from '../../components/ui/Primitives';
import { useAuth } from '../../context/AuthContext';
import { articleText, visibleGuide } from '../../features/admin/help/guideContent';
import { cx } from '../../lib/format';

const SECTION_ICONS = { start: Compass, website: Globe, enquiries: Inbox, clients: Briefcase, talent: Sparkles, admin: ShieldCheck };

function Article({ article, open, onToggle, highlight }) {
  return (
    <li id={`guide-${article.id}`} className={cx('scroll-mt-24 rounded-2xl border bg-app-surface transition-colors', highlight ? 'border-app-accent' : 'border-app-border')}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`guide-${article.id}-body`}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-semibold text-app-text"
        >
          <span className="min-w-0">{article.title}</span>
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-app-subtle transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      {open && (
        <div id={`guide-${article.id}-body`} className="space-y-4 border-t border-app-border px-5 py-4 text-sm leading-relaxed text-app-text">
          {article.summary && <p className="text-app-subtle">{article.summary}</p>}
          {article.steps?.length > 0 && (
            <ol className="space-y-2.5">
              {article.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-muted text-xs font-semibold" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="min-w-0 pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          )}
          {article.points?.length > 0 && (
            <ul className="space-y-2">
              {article.points.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-app-accent" aria-hidden />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {article.tip && (
            <p className="flex gap-3 rounded-xl bg-status-success/10 px-4 py-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold">Good to know: </span>
                {article.tip}
              </span>
            </p>
          )}
          {article.warning && (
            <p className="flex gap-3 rounded-xl bg-status-warning/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold">Be careful: </span>
                {article.warning}
              </span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** Staff Help & Guide — only shows the topics this person's role can use. */
export default function HelpPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set(topic ? [topic] : []));

  const sections = useMemo(() => visibleGuide(can), [can]);
  const query = q.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);

  const shown = useMemo(() => {
    if (!terms.length) return sections;
    return sections
      .map((s) => ({ ...s, articles: s.articles.filter((a) => terms.every((t) => articleText(a).includes(t))) }))
      .filter((s) => s.articles.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, query]);
  const resultCount = shown.reduce((n, s) => n + s.articles.length, 0);

  // Opened from the "Help" button on another page → open and scroll to that topic
  useEffect(() => {
    if (!topic) return;
    setOpen((o) => new Set(o).add(topic));
    const t = setTimeout(() => document.getElementById(`guide-${topic}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [topic]);

  const toggle = (id) =>
    setOpen((o) => {
      const next = new Set(o);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const jump = (sectionId) => {
    setQ('');
    if (topic) setParams({}, { replace: true });
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isOpen = (id) => Boolean(terms.length) || open.has(id);

  return (
    <>
      <PageHeader
        eyebrow="Staff guide"
        title="Help & guide"
        description="How every part of the Royal Bee platform works, written for the team. You only see the topics your role can use."
      />

      <div className="mb-6 max-w-xl">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the guide — e.g. invoice, publish, archive talent"
          aria-label="Search the guide"
          prefix={<Search className="h-4 w-4" />}
          suffix={
            q && (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-app-subtle hover:text-app-text">
                <X className="h-4 w-4" />
              </button>
            )
          }
        />
        {terms.length > 0 && (
          <p className="mt-2 text-xs text-app-subtle" role="status">
            {resultCount} {resultCount === 1 ? 'topic' : 'topics'} found
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Contents */}
        <nav aria-label="Guide contents" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.18em] text-app-subtle lg:block">Contents</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {sections.map((s) => {
              const Icon = SECTION_ICONS[s.id] || BookOpen;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => jump(s.id)}
                    className="flex items-center gap-2 rounded-full border border-app-border px-3 py-1.5 text-sm text-app-text hover:bg-app-muted lg:w-full lg:rounded-lg lg:border-0 lg:px-3 lg:py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                    <span>{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Topics */}
        <div className="min-w-0 space-y-10">
          {shown.length === 0 ? (
            <EmptyState icon={Search} title="Nothing found" message="Try a different word — for example “payment”, “publish” or “booking”." />
          ) : (
            shown.map((s) => {
              const Icon = SECTION_ICONS[s.id] || BookOpen;
              return (
                <section key={s.id} id={`section-${s.id}`} aria-labelledby={`section-${s.id}-title`} className="scroll-mt-24">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-muted text-app-accent">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id={`section-${s.id}-title`} className="font-display text-2xl font-semibold">
                        {s.title}
                      </h2>
                      {s.intro && <p className="text-sm text-app-subtle">{s.intro}</p>}
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {s.articles.map((a) => (
                      <Article key={a.id} article={a} open={isOpen(a.id)} onToggle={() => toggle(a.id)} highlight={a.id === topic} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
          <p className="text-xs text-app-subtle">Something missing or out of date? Tell your administrator so the guide can be updated.</p>
        </div>
      </div>
    </>
  );
}