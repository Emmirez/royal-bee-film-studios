import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Input from '../../../components/ui/Input';
import { EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { formatDate, timeAgo } from '../../../lib/format';

export default function ContactsPage() {
  const [stage, setStage] = useState('');
  const [q, setQ] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAdminList('/crm/contacts', { stage, q, followUp, page });
  const items = data?.data || [];

  return (
    <>
      <PageHeader eyebrow="Clients & leads" title="CRM contacts" description="One record per person or organization — website enquiries and messages update the same record instead of creating duplicates." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={followUp ? 'due' : stage}
          onChange={(v) => {
            setPage(1);
            if (v === 'due') {
              setFollowUp('due');
              setStage('');
            } else {
              setFollowUp('');
              setStage(v);
            }
          }}
          tabs={[{ value: '', label: 'All' }, { value: 'lead', label: 'Leads' }, { value: 'prospect', label: 'Prospects' }, { value: 'client', label: 'Clients' }, { value: 'inactive', label: 'Inactive' }, { value: 'due', label: 'Follow-up due' }]}
        />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search contacts…" prefix={<Search className="h-4 w-4" />} className="lg:w-72" aria-label="Search contacts" />
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No contacts" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-app-border text-left text-xs uppercase tracking-wider text-app-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3 text-right font-semibold">Enquiries</th>
                <th className="px-5 py-3 font-semibold">Owner</th>
                <th className="px-5 py-3 font-semibold">Follow-up</th>
                <th className="px-5 py-3 font-semibold">Last contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-app-muted">
                  <td className="px-5 py-3">
                    <Link to={`/admin/contacts/${c._id}`} className="font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-app-subtle">
                      {c.email}
                      {c.organization ? ` · ${c.organization}` : ''}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.stage} />
                  </td>
                  <td className="px-5 py-3 text-right tabular">{c.enquiryCount}</td>
                  <td className="px-5 py-3">{c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : <span className="text-app-subtle">—</span>}</td>
                  <td className="px-5 py-3">{c.followUpAt ? <span className={new Date(c.followUpAt) < new Date() ? 'font-semibold text-status-warning' : ''}>{formatDate(c.followUpAt)}</span> : '—'}</td>
                  <td className="px-5 py-3 text-app-subtle">{timeAgo(c.lastContactAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
