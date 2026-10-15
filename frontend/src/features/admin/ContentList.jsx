import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, Plus, Search, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../components/ui/Primitives';
import SortableList from '../../components/admin/SortableList';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminList, useCrud } from './adminApi';
import { imageUrl } from '../../lib/images';
import { P } from '../../lib/permissions';
import { timeAgo } from '../../lib/format';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

/**
 * Generic list for workflow content (services, productions, news).
 * `sortable` enables drag-to-reorder when viewing all items without a search.
 */
export default function ContentList({ resource, basePath, publicPath, title, description, eyebrow = 'Website', sortable = false, subtitle, newLabel = 'New' }) {
  const { can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;
  const [q, setQ] = useState(params.get('q') || '');
  const { data, isLoading, error, refetch, isFetching } = useAdminList(resource, { status, q: params.get('q') || '', page, limit: sortable ? 200 : 25 });
  const { reorder } = useCrud(resource);
  const [items, setItems] = useState([]);
  useEffect(() => setItems(data?.data || []), [data]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q);
      else next.delete('q');
      next.delete('page');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const canReorder = sortable && can(P.CMS_EDIT) && !status && !params.get('q');

  const row = (item, handle) => (
    <div className="flex items-center gap-3 border-b border-app-border px-3 py-3 last:border-0 sm:px-4">
      {handle}
      <Link to={`${basePath}/${item._id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <span className="hidden h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-app-muted sm:block">
          {item.coverImage?.url && <img src={imageUrl(item.coverImage, 160)} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{item.title}</span>
            {item.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-app-accent text-app-accent" aria-label="Featured" />}
            {item.isPlaceholder && <Badge tone="warning">Sample</Badge>}
          </span>
          <span className="block truncate text-xs text-app-subtle">
            {subtitle?.(item)}
            {subtitle ? ' · ' : ''}Updated {timeAgo(item.updatedAt)}
          </span>
        </span>
      </Link>
      <StatusBadge status={item.status} />
      {item.status === 'published' && publicPath && (
        <a href={`${publicPath}/${item.slug}`} target="_blank" rel="noopener noreferrer" className="hidden rounded-full p-2 text-app-subtle hover:bg-app-muted sm:block" aria-label={`View ${item.title} on the website`}>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={can(P.CMS_EDIT) && <Button to={`${basePath}/new`} icon={Plus}>{newLabel}</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          tabs={STATUS_TABS}
          value={status}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            if (v) next.set('status', v);
            else next.delete('status');
            next.delete('page');
            setParams(next);
          }}
        />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" prefix={<Search className="h-4 w-4" />} className="lg:w-72" aria-label={`Search ${title}`} />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" message={status || q ? 'Try a different filter or search.' : `Create your first ${title.toLowerCase().replace(/s$/, '')}.`} action={can(P.CMS_EDIT) && !status && <Button to={`${basePath}/new`} icon={Plus}>{newLabel}</Button>} />
      ) : (
        <div className={`card overflow-hidden transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          {canReorder ? (
            <SortableList
              items={items}
              onReorder={async (next) => {
                const prev = items;
                setItems(next);
                try {
                  await reorder.mutateAsync(next.map((i) => i._id));
                } catch (err) {
                  setItems(prev);
                  toast.error(err.message);
                }
              }}
              renderItem={(item, { handle }) => row(item, handle)}
            />
          ) : (
            items.map((item) => <div key={item._id}>{row(item, null)}</div>)
          )}
        </div>
      )}
      {!sortable && <Pagination meta={data?.meta} onPage={(p) => setParams({ ...Object.fromEntries(params), page: String(p) })} />}
    </>
  );
}
