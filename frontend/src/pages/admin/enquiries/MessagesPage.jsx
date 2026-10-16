import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import { useAdminList } from '../../../features/admin/adminApi';
import { timeAgo, cx } from '../../../lib/format';

export default function MessagesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
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
                <Link to={`/admin/messages/${m._id}`} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-app-muted">
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', m.status === 'new' ? 'bg-app-accent' : 'bg-transparent')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate', m.status === 'new' && 'font-semibold')}>
                      {m.name} — {m.subject || 'No subject'}
                    </span>
                    <span className="block truncate text-xs text-app-subtle">{m.message}</span>
                  </span>
                  <span className="hidden text-xs text-app-subtle sm:block">{timeAgo(m.createdAt)}</span>
                  <StatusBadge status={m.status} />
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