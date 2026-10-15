import { Fragment, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { formatDateTime, cx } from '../../../lib/format';

const SEVERITY_TONES = { info: 'neutral', notice: 'info', warning: 'warning', critical: 'danger' };

/** Read-only audit trail. Audit events cannot be edited or deleted. */
export default function AuditLogPage() {
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/admin/audit', { action, severity, page });
  const items = data?.data || [];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit trail" description="A tamper-resistant record of sensitive actions. Entries can’t be edited or deleted." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input value={action} onChange={(e) => { setAction(e.target.value.toLowerCase()); setPage(1); }} placeholder="Filter by action, e.g. auth. or cms.service" className="sm:w-80" aria-label="Filter by action" />
        <Select value={severity} onChange={(v) => { setSeverity(v || ''); setPage(1); }} placeholder="All severities" clearable size="sm" className="sm:w-48" options={['info', 'notice', 'warning', 'critical'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No matching events" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-app-border text-left text-xs uppercase tracking-wider text-app-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Who</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Record</th>
                <th className="px-5 py-3 font-semibold">Severity</th>
                <th className="px-5 py-3"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {items.map((e) => (
                <Fragment key={e._id}>
                  <tr>
                    <td className="whitespace-nowrap px-5 py-3 text-app-subtle">{formatDateTime(e.createdAt)}</td>
                    <td className="px-5 py-3">{e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : e.actorEmail || <span className="text-app-subtle">System / visitor</span>}</td>
                    <td className="px-5 py-3 font-mono text-xs">{e.action}</td>
                    <td className="px-5 py-3 text-xs text-app-subtle">{e.entityType} {e.summary && `· ${e.summary}`}</td>
                    <td className="px-5 py-3"><Badge tone={SEVERITY_TONES[e.severity]}>{e.severity}</Badge></td>
                    <td className="px-5 py-3">
                      {(e.before || e.after || e.metadata) && (
                        <button type="button" onClick={() => setOpen(open === e._id ? null : e._id)} aria-expanded={open === e._id} className="rounded p-1 text-app-subtle hover:bg-app-muted" aria-label="Show details">
                          <ChevronDown className={cx('h-4 w-4 transition', open === e._id && 'rotate-180')} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === e._id && (
                    <tr>
                      <td colSpan={6} className="bg-app-raised px-5 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {['before', 'after', 'metadata'].filter((k) => e[k]).map((k) => (
                            <div key={k}>
                              <p className="mb-1 text-xs font-semibold uppercase text-app-subtle">{k}</p>
                              <pre className="max-h-72 overflow-auto rounded-lg bg-app-muted p-3 text-[11px] leading-relaxed">{JSON.stringify(e[k], null, 2)}</pre>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
