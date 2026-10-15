import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDate, timeAgo } from '../../../lib/format';

const STATUS_TABS = ['', 'new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'closed', 'spam'];

export default function EnquiriesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const query = {
    status: params.get('status') || '',
    assignedTo: params.get('assignedTo') || '',
    kind: params.get('kind') || '',
    q: params.get('q') || '',
    page: Number(params.get('page')) || 1,
  };
  const { data, isLoading, error, refetch, isFetching } = useAdminList('/enquiries', query);
  const counts = data?.meta?.statusCounts || {};

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') || '') !== q) setParams({ ...Object.fromEntries(params), q, page: '1' }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setParams(next);
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/enquiries/export', { query: { status: query.status, assignedTo: query.assignedTo, q: query.q }, raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Clients & leads"
        title="Enquiries"
        description="Project enquiries from the website. Each one is linked to a CRM contact."
        actions={can(P.ENQUIRIES_EXPORT) && <Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={query.status}
          onChange={(v) => setParam('status', v)}
          tabs={STATUS_TABS.map((s) => ({ value: s, label: s ? s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'All', count: s ? counts[s] || 0 : undefined }))}
        />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, reference…" prefix={<Search className="h-4 w-4" />} className="lg:w-72" aria-label="Search enquiries" />
      </div>
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {[
          ['', 'Everyone'],
          ['me', 'Assigned to me'],
          ['unassigned', `Unassigned (${data?.meta?.unassigned ?? 0})`],
        ].map(([v, l]) => (
          <button key={v || 'all'} type="button" aria-pressed={query.assignedTo === v} onClick={() => setParam('assignedTo', v)} className={`rounded-full border px-3 py-1.5 font-medium ${query.assignedTo === v ? 'border-app-text bg-app-text text-app-bg' : 'border-app-border text-app-subtle hover:text-app-text'}`}>
            {l}
          </button>
              ))}
        <span className="mx-1 hidden w-px self-stretch bg-app-border sm:block" aria-hidden />
        {[
          ['', 'All types'],
          ['project', 'Projects'],
          ['partnership', 'Partnerships'],
        ].map(([v, l]) => (
          <button key={v || 'all-kinds'} type="button" aria-pressed={query.kind === v} onClick={() => setParam('kind', v)} className={`rounded-full border px-3 py-1.5 font-medium ${query.kind === v ? 'border-app-text bg-app-text text-app-bg' : 'border-app-border text-app-subtle hover:text-app-text'}`}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No enquiries" message="New website enquiries will appear here." />
      ) : (
        <div className={`card overflow-hidden ${isFetching ? 'opacity-70' : ''}`}>
          <ul className="divide-y divide-app-border">
            {items.map((e) => (
              <li key={e._id}>
                <Link to={`/admin/enquiries/${e._id}`} className="grid gap-2 px-4 py-4 hover:bg-app-muted sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {e.contact?.name}
                      {e.contact?.organization && <span className="font-normal text-app-subtle"> · {e.contact.organization}</span>}
                    </p>
                    <p className="truncate text-xs text-app-subtle">
                      <span className="font-mono">{e.reference}</span> · {e.contact?.email}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate">{e.serviceTitle || 'General enquiry'}</p>
                    <p className="truncate text-xs text-app-subtle">{e.budgetRange || 'No budget given'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-app-subtle">
                    {e.kind === 'partnership' && <Badge tone="gold">Partnership</Badge>}
                    {e.possibleDuplicateOf && <Badge tone="warning">Possible duplicate</Badge>}
                    {e.assignedTo ? <span>→ {e.assignedTo.firstName}</span> : <Badge>Unassigned</Badge>}
                    <span title={formatDate(e.createdAt)}>{timeAgo(e.createdAt)}</span>
                  </div>
                  <StatusBadge status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={(p) => setParams({ ...Object.fromEntries(params), page: String(p) })} />
    </>
  );
}
