import { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader } from '../../../components/ui/Primitives';
import { useAdminList, useCrud, useOptions } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { P } from '../../../lib/permissions';
import { formatDate, titleCase } from '../../../lib/format';

const PLACEMENTS = ['navbar', 'hero', 'home_banner', 'home_footer', 'service_page', 'production_page', 'founder_page', 'news_page', 'global_footer'];
const EMPTY = { name: '', label: '', description: '', href: '/enquire', placement: 'navbar', variant: 'primary', context: { service: null, production: null }, startsAt: '', endsAt: '' };
const toInput = (d) => (d ? String(d).slice(0, 10) : '');

/** Calls to action: button text, destination, placement, visibility, context and schedule. Clicks are counted in aggregate only. */
export default function CtasAdminPage() {
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const resource = '/cms/ctas';
  const { data, isLoading, error, refetch } = useAdminList(resource, { limit: 200 });
  const { create, update, remove, publish, unpublish } = useCrud(resource);
  const serviceOptions = useOptions('/cms/services');
  const productionOptions = useOptions('/cms/productions');
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const items = data?.data || [];

  const save = async () => {
    setErrors({});
    const body = {
      name: editing.name,
      label: editing.label,
      description: editing.description,
      href: editing.href,
      placement: editing.placement,
      variant: editing.variant,
      context: { service: editing.context?.service || null, production: editing.context?.production || null },
      startsAt: editing.startsAt || null,
      endsAt: editing.endsAt || null,
    };
    try {
      if (editing._id) await update.mutateAsync({ id: editing._id, ...body });
      else await create.mutateAsync(body);
      toast.success(editing._id ? 'Call to action saved' : 'Created — publish it to show it on the site');
      setEditing(null);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Calls to action"
        description="Buttons shown around the website. Click counts are aggregate only — no personal data is collected."
        actions={can(P.CMS_EDIT) && <Button icon={Plus} onClick={() => setEditing({ ...EMPTY })}>New call to action</Button>}
      />
      {items.length === 0 ? (
        <EmptyState title="No calls to action" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-app-border text-left text-xs uppercase tracking-wider text-app-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Placement</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {items.map((c) => (
                <tr key={c._id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-app-subtle">“{c.label}”</p>
                  </td>
                  <td className="px-4 py-3">{titleCase(c.placement)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs">{c.href}</td>
                  <td className="px-4 py-3 text-xs text-app-subtle">{c.startsAt || c.endsAt ? `${formatDate(c.startsAt) || 'now'} → ${formatDate(c.endsAt) || '∞'}` : 'Always'}</td>
                  <td className="px-4 py-3 text-right tabular">{c.clicks || 0}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.isPublished ? 'success' : 'neutral'} dot>
                      {c.isPublished ? 'Live' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {can(P.CMS_PUBLISH) && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={c.isPublished ? 'Hide' : 'Publish'}
                          onClick={() => (c.isPublished ? unpublish : publish).mutateAsync(c._id).then(() => toast.success(c.isPublished ? 'Hidden' : 'Live on the website')).catch((e) => toast.error(e.message))}
                        >
                          {c.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      {can(P.CMS_EDIT) && (
                        <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEditing({ ...EMPTY, ...c, startsAt: toInput(c.startsAt), endsAt: toInput(c.endsAt) })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {can(P.CMS_DELETE) && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-status-danger"
                          aria-label="Delete"
                          onClick={async () => (await confirm({ title: `Delete “${c.name}”?`, tone: 'danger', confirmLabel: 'Delete' })) && remove.mutateAsync(c._id).then(() => toast.success('Deleted')).catch((e) => toast.error(e.message))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit call to action' : 'New call to action'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={create.isPending || update.isPending} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name (internal)" value={editing.name} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} error={errors.name} />
            <Input label="Button text" value={editing.label} onChange={(e) => setEditing((x) => ({ ...x, label: e.target.value }))} error={errors.label} maxLength={60} />
            <Input label="Destination" value={editing.href} onChange={(e) => setEditing((x) => ({ ...x, href: e.target.value }))} error={errors.href} hint="/enquire, /contact, #section or a full URL" />
            <Select label="Placement" value={editing.placement} onChange={(v) => setEditing((x) => ({ ...x, placement: v }))} options={PLACEMENTS.map((p) => ({ value: p, label: titleCase(p) }))} />
            <Select label="Style" value={editing.variant} onChange={(v) => setEditing((x) => ({ ...x, variant: v }))} options={[{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }, { value: 'ghost', label: 'Subtle' }]} />
            <Input label="Description (optional)" value={editing.description} onChange={(e) => setEditing((x) => ({ ...x, description: e.target.value }))} />
            {editing.placement === 'service_page' && (
              <Select label="Only on this service" clearable value={editing.context?.service} onChange={(v) => setEditing((x) => ({ ...x, context: { ...x.context, service: v } }))} options={serviceOptions} placeholder="All services" />
            )}
            {editing.placement === 'production_page' && (
              <Select label="Only on this production" clearable searchable value={editing.context?.production} onChange={(v) => setEditing((x) => ({ ...x, context: { ...x.context, production: v } }))} options={productionOptions} placeholder="All productions" />
            )}
            <Input label="Show from (optional)" type="date" value={editing.startsAt} onChange={(e) => setEditing((x) => ({ ...x, startsAt: e.target.value }))} />
            <Input label="Show until (optional)" type="date" value={editing.endsAt} onChange={(e) => setEditing((x) => ({ ...x, endsAt: e.target.value }))} />
          </div>
        )}
      </Modal>
    </>
  );
}
