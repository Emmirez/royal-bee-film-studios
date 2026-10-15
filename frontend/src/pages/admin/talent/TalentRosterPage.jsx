import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Sparkles, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { EmptyState, ErrorState, PageHeader, PageLoader, Pagination, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { AVAILABILITY, AvailabilityBadge, TALENT_TYPES, TalentStatusBadge } from '../../../features/talent/talentUi';
import { imageUrl } from '../../../lib/images';
import { timeAgo } from '../../../lib/format';

/** Staff: the private talent roster + website applications. */
export default function TalentRosterPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'approved';
  const [type, setType] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAdminList('/talent', { status, type: type || undefined, availability: availability || undefined, q, page });
  const items = data?.data || [];
  const counts = data?.meta?.statusCounts || {};

  return (
    <>
      <PageHeader
        eyebrow="Talent"
        title="Talent roster"
        description="Private — only staff can see the roster. People apply on the website (Join our talent roster); approving them sends an invite to their talent portal."
        actions={
          <Button variant="secondary" href="/join-talent" target="_blank" rel="noopener noreferrer">
            View application form
          </Button>
        }
      />
      <div className="mb-4 -mx-1 overflow-x-auto px-1">
        <Tabs
          value={status}
          onChange={(v) => { setParams(v === 'approved' ? {} : { status: v }, { replace: true }); setPage(1); }}
          tabs={[
            { value: 'approved', label: 'On roster', count: counts.approved || 0 },
            { value: 'pending', label: 'Applications', count: counts.pending || 0 },
            { value: 'rejected', label: 'Declined', count: counts.rejected || 0 },
            { value: 'archived', label: 'Archived', count: counts.archived || 0 },
          ]}
        />
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, city, skill, language…" prefix={<Search className="h-4 w-4" />} aria-label="Search talent" />
        <Select value={type} onChange={(v) => { setType(v); setPage(1); }} options={TALENT_TYPES} clearable placeholder="Any type" />
        <Select value={availability} onChange={(v) => { setAvailability(v); setPage(1); }} options={AVAILABILITY} clearable placeholder="Any availability" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={Sparkles} title={status === 'pending' ? 'No applications waiting' : 'Nobody here yet'} message={status === 'approved' ? 'Approve applications to build your roster.' : undefined} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((t) => (
            <li key={t.id} className="min-w-0">
              <Link to={`/admin/talent/${t.id}`} className="card group block h-full overflow-hidden transition hover:shadow-lift">
                <div className="relative aspect-[3/4] bg-app-muted">
                  {t.photo?.url ? (
                    <img src={imageUrl(t.photo, 500)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <UserRound className="h-12 w-12 text-app-subtle" aria-hidden />
                    </span>
                  )}
                  <span className="absolute left-2 top-2">{status === 'approved' ? <AvailabilityBadge availability={t.availability} /> : <TalentStatusBadge status={t.status} />}</span>
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold">{t.displayName}</p>
                  <p className="truncate text-xs text-app-subtle">{t.talentTypeLabels?.join(' · ')}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-app-subtle">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {t.city || '—'}
                    {status === 'pending' && <span className="ml-auto">{timeAgo(t.createdAt)}</span>}
                  </p>
                  {status === 'approved' && t.accountStatus === 'invited' && <p className="mt-1 text-[11px] font-semibold text-status-warning">Invite not accepted yet</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}