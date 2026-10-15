import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2, FileText, Receipt, Search, Settings2, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { EmptyState, ErrorState, PageHeader, PageLoader, Pagination, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { DocStatusBadge, day, money } from '../../../features/invoices/invoiceUi';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { cx } from '../../../lib/format';

const INVOICE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Drafts' },
  { value: 'void', label: 'Cancelled' },
];
const QUOTE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'sent', label: 'Awaiting reply' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'converted', label: 'Invoiced' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'draft', label: 'Drafts' },
];

function Summary() {
  const { data } = useQuery({ queryKey: ['admin', '/invoices', 'summary'], queryFn: async () => (await api.get('/invoices/summary')).data });
  if (!data) return null;
  const cards = data.currencies.length ? data.currencies : [{ currency: 'NGN', outstanding: 0, overdue: 0, overdueCount: 0, paidThisMonth: 0 }];
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.currency} className="card p-5 sm:col-span-2 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">{c.currency}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-app-subtle">Outstanding</p>
              <p className="truncate text-lg font-semibold tabular">{money(c.outstanding, c.currency)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-app-subtle">Overdue{c.overdueCount ? ` (${c.overdueCount})` : ''}</p>
              <p className={cx('truncate text-lg font-semibold tabular', c.overdue > 0 && 'text-status-danger')}>{money(c.overdue, c.currency)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-app-subtle">Received this month</p>
              <p className="truncate text-lg font-semibold tabular text-status-success">{money(c.paidThisMonth, c.currency)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Staff: invoices and quotes (records only — clients pay off the website). */
export default function InvoicesPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') === 'quote' ? 'quote' : 'invoice';
  const status = params.get('status') || '';
  const clientId = params.get('clientId') || '';
  const projectId = params.get('projectId') || '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'kind') next.delete('status');
    setParams(next, { replace: true });
    setPage(1);
  };

  const { data, isLoading, error, refetch } = useAdminList('/invoices', { kind, status: status || undefined, clientId: clientId || undefined, projectId: projectId || undefined, q, page });
  const items = data?.data || [];
  const manage = can(P.INVOICES_MANAGE);
  const newLink = (k) => `/admin/invoices/new?kind=${k}${clientId ? `&clientId=${clientId}` : ''}${projectId ? `&projectId=${projectId}` : ''}`;

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Invoices & quotes"
        description="Records only — clients pay off the website (e.g. bank transfer) and you record each payment here."
        actions={
          manage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" icon={Settings2} to="/admin/invoices/settings">
                Billing details
              </Button>
              <Button variant="secondary" icon={FileText} to={newLink('quote')}>
                New quote
              </Button>
              <Button icon={FilePlus2} to={newLink('invoice')}>
                New invoice
              </Button>
            </div>
          )
        }
      />

      <Summary />

      {(clientId || projectId) && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          <span className="font-semibold">{projectId ? 'Showing one project' : 'Showing one client'}</span>
          <Button size="sm" variant="ghost" icon={X} onClick={() => setParams(new URLSearchParams(kind === 'quote' ? { kind } : {}), { replace: true })}>
            Show all
          </Button>
        </div>
      )}

      <div className="mb-4">
        <Tabs value={kind} onChange={(v) => setParam('kind', v === 'invoice' ? '' : v)} tabs={[{ value: 'invoice', label: 'Invoices' }, { value: 'quote', label: 'Quotes' }]} />
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 overflow-x-auto px-1">
          <Tabs value={status} onChange={(v) => setParam('status', v)} tabs={kind === 'quote' ? QUOTE_FILTERS : INVOICE_FILTERS} />
        </div>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search number, title or client…" prefix={<Search className="h-4 w-4" />} className="lg:w-80" aria-label="Search invoices" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={kind === 'quote' ? 'No quotes here' : 'No invoices here'}
          message={status ? 'Try another filter.' : undefined}
          action={manage && !status && <Button icon={FilePlus2} to={newLink(kind)}>{kind === 'quote' ? 'New quote' : 'New invoice'}</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {items.map((d) => (
              <li key={d.id}>
                <Link to={`/admin/invoices/${d.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-app-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                      <span className="font-mono text-sm">{d.reference}</span>
                      {d.title && <span className="truncate font-normal text-app-subtle">· {d.title}</span>}
                    </p>
                    <p className="truncate text-xs text-app-subtle">
                      {d.client?.name}
                      {d.client?.organization ? ` · ${d.client.organization}` : ''}
                      {d.project ? ` · ${d.project.title}` : ''}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs text-app-subtle sm:block">
                    <p>Issued {day(d.issueDate)}</p>
                    <p className={cx(d.displayStatus === 'overdue' && 'font-semibold text-status-danger')}>
                      {kind === 'quote' ? 'Valid until' : 'Due'} {day(d.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{money(d.total, d.currency)}</p>
                    {kind === 'invoice' && d.amountPaid > 0 && d.balance > 0 && <p className="text-xs text-app-subtle tabular">{money(d.balance, d.currency)} due</p>}
                  </div>
                  <DocStatusBadge doc={d} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}