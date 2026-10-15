import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, MapPin, Megaphone } from 'lucide-react';
import Seo from '../../components/public/Seo';
import { Badge, EmptyState, ErrorState, PageLoader, Tabs } from '../../components/ui/Primitives';
import { ApplicationStatusBadge, dayUtc } from '../../features/talent/talentUi';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';

/** Talent: open casting calls and my applications. */
export default function TalentCastingsPage() {
  const [tab, setTab] = useState('open');
  const [onlyMine, setOnlyMine] = useState(true);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['talent', 'castings'], queryFn: async () => (await api.get('/talent-portal/castings')).data, refetchOnWindowFocus: true });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const open = (data.open || []).filter((c) => !onlyMine || c.matchesYou);
  const mine = data.myApplications || [];

  return (
    <>
      <Seo title="Casting calls" noIndex />
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Casting calls</h1>
      <p className="mb-6 mt-2 max-w-2xl text-app-subtle">Apply to roles that suit you. The team will let you know if you’re shortlisted.</p>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'open', label: 'Open now', count: (data.open || []).length },
          { value: 'mine', label: 'My applications', count: mine.length },
        ]}
      />

      {tab === 'open' ? (
        <>
          <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4 accent-current" />
            Only show castings for my talent types
          </label>
          {open.length === 0 ? (
            <EmptyState icon={Megaphone} title="No open casting calls right now" message="We’ll email you when a new one matches your profile." />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {open.map((c) => (
                <li key={c.id} className="min-w-0">
                  <Link to={`/talent/castings/${c.id}`} className="card group block h-full p-5 transition hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-xl font-semibold">{c.title}</p>
                      {c.myApplication ? <ApplicationStatusBadge status={c.myApplication.status} /> : c.matchesYou && <Badge tone="gold">For you</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-app-subtle">{c.talentTypeLabels?.length ? c.talentTypeLabels.join(' · ') : 'All talent'}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-subtle">
                      {c.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden /> {c.location}
                        </span>
                      )}
                      {c.shootDates && <span>{c.shootDates}</span>}
                      {c.applyBy && (
                        <span className="inline-flex items-center gap-1 font-semibold text-app-text">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Apply by {dayUtc(c.applyBy)}
                        </span>
                      )}
                      <ArrowRight className="ml-auto h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : mine.length === 0 ? (
        <EmptyState icon={Megaphone} title="You haven’t applied to anything yet" />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {mine.map((a) => (
              <li key={a.id}>
                <Link to={`/talent/castings/${a.casting?.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-app-muted/60">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.casting?.title}</span>
                    <span className="block text-xs text-app-subtle">Applied {timeAgo(a.createdAt)}</span>
                  </span>
                  <ApplicationStatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}