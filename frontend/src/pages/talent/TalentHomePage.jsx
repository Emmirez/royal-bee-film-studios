import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarCheck, CheckCircle2, Circle, MapPin, Megaphone, UserRound } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { AvailabilityBadge, bookingDates } from '../../features/talent/talentUi';
import { api } from '../../lib/api';
import { imageUrl } from '../../lib/images';
import { cx } from '../../lib/format';

/** Talent portal home. */
export default function TalentHomePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['talent', 'overview'], queryFn: async () => (await api.get('/talent-portal/overview')).data, refetchOnWindowFocus: true });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { profile: p, completeness, matchingCastings, pendingOffers, upcoming } = data;

  return (
    <>
      <Seo title="Talent portal" noIndex />
      <div className="mb-8 flex items-center gap-5">
        <span className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-app-muted">
          {p.photo?.url ? <img src={imageUrl(p.photo, 200)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-6 h-7 w-7 text-app-subtle" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-accent">Talent portal</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-5xl">Hi, {p.stageName || p.firstName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-app-subtle">
            <AvailabilityBadge availability={p.availability} />
            {p.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.city}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link to="/talent/bookings" className={cx('card flex items-center gap-4 p-5 transition hover:shadow-lift', pendingOffers > 0 && 'border-gold-500/50 bg-gold-500/10')}>
          <CalendarCheck className="h-8 w-8 shrink-0 text-app-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-2xl font-semibold tabular">{pendingOffers}</span>
            <span className="block text-sm text-app-subtle">{pendingOffers === 1 ? 'Booking offer to answer' : 'Booking offers to answer'}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-app-subtle" aria-hidden />
        </Link>
        <Link to="/talent/castings" className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
          <Megaphone className="h-8 w-8 shrink-0 text-app-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-2xl font-semibold tabular">{matchingCastings}</span>
            <span className="block text-sm text-app-subtle">{matchingCastings === 1 ? 'Open casting call for you' : 'Open casting calls for you'}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-app-subtle" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your upcoming jobs">
          {upcoming.length === 0 ? (
            <p className="text-sm text-app-subtle">No confirmed jobs coming up yet.</p>
          ) : (
            <ul className="divide-y divide-app-border">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link to={`/talent/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{b.role}</span>
                      <span className="block truncate text-xs text-app-subtle">
                        {bookingDates(b)}
                        {b.callTime ? ` · call ${b.callTime}` : ''}
                        {b.location ? ` · ${b.location}` : ''}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Profile ${completeness.percent}% complete`} description="A complete profile gets you considered for more roles.">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-app-muted" aria-hidden>
            <div className="h-full rounded-full bg-app-accent transition-all" style={{ width: `${completeness.percent}%` }} />
          </div>
          <ul className="space-y-2 text-sm">
            {completeness.checks.map((c) => (
              <li key={c.key} className={cx('flex items-center gap-2', c.done && 'text-app-subtle line-through')}>
                {c.done ? <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden /> : <Circle className="h-4 w-4 text-app-subtle" aria-hidden />}
                {c.label}
              </li>
            ))}
          </ul>
          {completeness.percent < 100 && (
            <Button size="sm" className="mt-4" to="/talent/profile">
              Complete my profile
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}