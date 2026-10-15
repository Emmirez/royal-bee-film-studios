import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Clapperboard, Eye } from 'lucide-react';
import Seo from '../../components/public/Seo';
import { Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { ProjectStatusBadge, PROJECT_STAGES } from '../../features/projects/projectUi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cx, formatDate, timeAgo } from '../../lib/format';

/** Client portal home: the client's own projects. */
export default function PortalHomePage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal', 'projects'],
    queryFn: async () => (await api.get('/portal/projects')).data,
    refetchOnWindowFocus: true,
  });

  const projects = data || [];
  const toReview = projects.reduce((n, p) => n + (p.awaitingReview || 0), 0);

  return (
    <>
      <Seo title="My projects" noIndex />
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-accent">Client portal</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Welcome, {user?.firstName}</h1>
        <p className="mt-2 max-w-2xl text-app-subtle">Follow your projects, review work as it’s ready and message the team — all in one place.</p>
      </div>

      {toReview > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gold-500/15 px-5 py-4 text-sm">
          <Eye className="h-5 w-5 shrink-0 text-gold-700 dark:text-gold-300" aria-hidden />
          <p>
            <strong>{toReview} item{toReview > 1 ? 's are' : ' is'} waiting for your review.</strong> Open the project to approve or request changes.
          </p>
        </div>
      )}

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState icon={Clapperboard} title="No projects yet" message="When the studio sets up your project, it will appear here and you’ll get an email." />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {projects.map((p) => {
            const stageIndex = PROJECT_STAGES.findIndex((s) => s.value === p.stage);
            return (
              <li key={p.id} className="min-w-0">
                <Link to={`/portal/projects/${p.id}`} className="card group block h-full p-6 transition hover:border-app-text/30 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-app-subtle">{p.reference}</p>
                      <h2 className="mt-1 font-display text-2xl font-semibold">{p.title}</h2>
                      {p.serviceTitle && <p className="text-sm text-app-subtle">{p.serviceTitle}</p>}
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{p.stageLabel}</span>
                      <span className="text-app-subtle">
                        Stage {stageIndex + 1} of {PROJECT_STAGES.length}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-1" aria-hidden>
                      {PROJECT_STAGES.map((s, i) => (
                        <span key={s.value} className={cx('h-1.5 flex-1 rounded-full', i <= stageIndex ? 'bg-app-accent' : 'bg-app-border')} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-app-subtle">
                    {p.awaitingReview > 0 && <Badge tone="gold">{p.awaitingReview} to review</Badge>}
                    {p.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Target {formatDate(p.dueDate)}
                      </span>
                    )}
                    <span>Updated {timeAgo(p.lastActivityAt)}</span>
                    <span className="ml-auto inline-flex items-center gap-1 font-semibold text-app-text">
                      Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}