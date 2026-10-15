import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import Seo from '../../components/public/Seo';
import { EmptyState, ErrorState, PageLoader, Tabs } from '../../components/ui/Primitives';
import { BookingStatusBadge, bookingDates } from '../../features/talent/talentUi';
import { api } from '../../lib/api';

const today = () => new Date(new Date().toISOString().slice(0, 10));

/** Talent: my bookings. */
export default function TalentBookingsPage() {
  const [tab, setTab] = useState('upcoming');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['talent', 'bookings'], queryFn: async () => (await api.get('/talent-portal/bookings')).data, refetchOnWindowFocus: true });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const all = data || [];
  const isUpcoming = (b) => ['offered', 'confirmed'].includes(b.status) && new Date(b.endDate || b.startDate) >= today();
  const offers = all.filter((b) => b.status === 'offered');
  const shown = tab === 'upcoming' ? all.filter(isUpcoming).sort((a, b) => new Date(a.startDate) - new Date(b.startDate)) : all.filter((b) => !isUpcoming(b));

  return (
    <>
      <Seo title="Bookings" noIndex />
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Bookings</h1>
      <p className="mb-6 mt-2 max-w-2xl text-app-subtle">Confirm or decline offers, see call times and locations, and message the team about each job.</p>
      {offers.length > 0 && (
        <p className="mb-5 rounded-2xl bg-gold-500/15 px-5 py-4 text-sm">
          <strong>
            {offers.length} booking offer{offers.length > 1 ? 's' : ''} waiting for your answer.
          </strong>{' '}
          Open {offers.length > 1 ? 'each one' : 'it'} to confirm or decline.
        </p>
      )}
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past & closed' }]} />
      {shown.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={tab === 'upcoming' ? 'No upcoming bookings' : 'Nothing here yet'} message={tab === 'upcoming' ? 'Apply to casting calls to get booked.' : undefined} />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {shown.map((b) => (
              <li key={b.id}>
                <Link to={`/talent/bookings/${b.id}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-app-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.role}</p>
                    <p className="truncate text-xs text-app-subtle">
                      {bookingDates(b)}
                      {b.callTime ? ` · call ${b.callTime}` : ''}
                      {b.location ? ` · ${b.location}` : ''}
                    </p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                  <ArrowRight className="hidden h-4 w-4 text-app-subtle transition group-hover:translate-x-0.5 sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}