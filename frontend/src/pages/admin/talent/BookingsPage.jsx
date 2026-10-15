import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, MessageCircle, Plus, Search, UserRound, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import BookingModal from '../../../features/talent/BookingModal';
import { BookingStatusBadge, bookingDates } from '../../../features/talent/talentUi';
import { useAuth } from '../../../context/AuthContext';
import { imageUrl } from '../../../lib/images';
import { P } from '../../../lib/permissions';

/** Staff: all talent bookings. */
export default function BookingsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'upcoming';
  const awaiting = params.get('awaiting') || '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/bookings', { status: awaiting ? undefined : status, awaiting: awaiting || undefined, q, page });
  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Talent"
        title="Bookings"
        description="Offers go to the talent’s portal and email; they confirm or decline there."
        actions={can(P.TALENT_MANAGE) && <Button icon={Plus} onClick={() => setCreating({})}>New booking</Button>}
      />
      {awaiting && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          <span className="font-semibold">Talent messages awaiting a reply</span>
          <Button size="sm" variant="ghost" icon={X} onClick={() => setParams({}, { replace: true })}>
            Show all bookings
          </Button>
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!awaiting ? (
          <div className="-mx-1 overflow-x-auto px-1">
            <Tabs
              value={status}
              onChange={(v) => { setParams(v === 'upcoming' ? {} : { status: v }, { replace: true }); setPage(1); }}
              tabs={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'offered', label: 'Awaiting reply' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'declined', label: 'Declined' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        ) : (
          <span />
        )}
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search talent, role, reference…" prefix={<Search className="h-4 w-4" />} className="lg:w-80" aria-label="Search bookings" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No bookings here" />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {items.map((b) => (
              <li key={b.id}>
                <Link to={`/admin/bookings/${b.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-app-muted/60">
                  <span className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-app-muted">
                    {b.talent?.photo?.url ? <img src={imageUrl(b.talent.photo, 120)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-3 h-5 w-5 text-app-subtle" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.role}</p>
                    <p className="truncate text-xs text-app-subtle">
                      {b.talent?.displayName} · {bookingDates(b)}
                      {b.project ? ` · ${b.project.title}` : ''}
                    </p>
                  </div>
                  {b.awaitingStaffReply && (
                    <Badge tone="gold">
                      <MessageCircle className="h-3 w-3" aria-hidden /> Reply needed
                    </Badge>
                  )}
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      <BookingModal open={Boolean(creating)} onClose={() => setCreating(null)} initial={creating} onSaved={(b) => navigate(`/admin/bookings/${b.id}`)} />
    </>
  );
}