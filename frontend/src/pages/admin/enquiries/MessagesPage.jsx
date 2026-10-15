import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Drawer from '../../../components/ui/Drawer';
import Select from '../../../components/ui/Select';
import { EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDateTime, timeAgo, titleCase, cx } from '../../../lib/format';

function MessageDrawer({ id, onClose }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data: m } = useQuery({ queryKey: ['admin', '/contact-messages', 'item', id], queryFn: async () => (await api.get(`/contact-messages/${id}`)).data, enabled: Boolean(id) });
  const update = useAdminMutation('/contact-messages', (status) => api.patch(`/contact-messages/${id}`, { status }));
  return (
    <Drawer open={Boolean(id)} onClose={onClose} title="Message">
      {!m ? (
        <PageLoader />
      ) : (
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-lg font-semibold">{m.subject || 'No subject'}</p>
            <p className="text-app-subtle">
              {m.name} · {m.email}
              {m.phone ? ` · ${m.phone}` : ''}
            </p>
            <p className="text-xs text-app-subtle">{formatDateTime(m.createdAt)}</p>
          </div>
          <p className="whitespace-pre-line rounded-xl bg-app-muted p-4 leading-relaxed">{m.message}</p>
          <p className="text-xs text-app-subtle">Marketing consent: {m.consent?.marketing ? 'Yes' : 'No'}</p>
          <div className="flex flex-wrap gap-2">
            <Button href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Your message'}`)}`} icon={Mail}>
              Reply by email
            </Button>
          </div>
          {can(P.ENQUIRIES_MANAGE) && (
            <Select
              label="Status"
              value={m.status}
              onChange={(s) => update.mutateAsync(s).then(() => toast.success('Status updated')).catch((e) => toast.error(e.message))}
              options={['new', 'read', 'replied', 'archived', 'spam'].map((s) => ({ value: s, label: titleCase(s) }))}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}

export default function MessagesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/contact-messages', { status, page });
  const items = data?.data || [];

  return (
    <>
      <PageHeader eyebrow="Clients & leads" title="Messages" description="General messages from the website contact form." />
      <Tabs className="mb-5 w-fit max-w-full" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'new', label: 'New', count: data?.meta?.unread }, { value: 'read', label: 'Read' }, { value: 'replied', label: 'Replied' }, { value: 'archived', label: 'Archived' }, { value: 'spam', label: 'Spam' }]} />
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No messages" />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {items.map((m) => (
              <li key={m._id}>
                <button type="button" onClick={() => setOpen(m._id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-app-muted">
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', m.status === 'new' ? 'bg-app-accent' : 'bg-transparent')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate', m.status === 'new' && 'font-semibold')}>
                      {m.name} — {m.subject || 'No subject'}
                    </span>
                    <span className="block truncate text-xs text-app-subtle">{m.message}</span>
                  </span>
                  <span className="hidden text-xs text-app-subtle sm:block">{timeAgo(m.createdAt)}</span>
                  <StatusBadge status={m.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      <MessageDrawer id={open} onClose={() => setOpen(null)} />
    </>
  );
}
