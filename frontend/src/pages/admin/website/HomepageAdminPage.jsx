import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Plus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import { EmptyState, ErrorState, PageHeader, PageLoader, StatusBadge, Switch } from '../../../components/ui/Primitives';
import SortableList from '../../../components/admin/SortableList';
import WorkflowBar from '../../../components/admin/WorkflowBar';
import { SECTION_TYPES, SectionContentForm } from '../../../features/admin/sectionForms';
import { useAdminList, useCrud } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { P } from '../../../lib/permissions';
import { cx } from '../../../lib/format';

const typeLabel = (t) => SECTION_TYPES.find((x) => x.value === t)?.label || t;

/**
 * Homepage builder: add, remove, enable/disable, reorder and edit sections.
 * Each section goes through draft → review → approval → publish.
 */
export default function HomepageAdminPage() {
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const resource = '/cms/home-sections';
  const { data, isLoading, error, refetch } = useAdminList(resource, { limit: 100 });
  const { create, update, remove, reorder, transition } = useCrud(resource);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);

  useEffect(() => setItems(data?.data || []), [data]);
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const canEdit = can(P.CMS_EDIT);

  const onReorder = async (next) => {
    const prev = items;
    setItems(next);
    try {
      await reorder.mutateAsync(next.map((s) => s._id));
      toast.success('Order saved');
    } catch (err) {
      setItems(prev);
      toast.error(err.message);
    }
  };

  /** Move a section one place up (-1) or down (+1) — works with a tap on phones. */
  const move = (i, d) => {
    const next = [...items];
    const [section] = next.splice(i, 1);
    next.splice(i + d, 0, section);
    onReorder(next);
  };

  const toggleEnabled = async (s) => {
    if (s.status === 'published' && !(can(P.CMS_PUBLISH) && can(P.CMS_APPROVE))) {
      toast.warning('This section is live — a publisher needs to make this change.');
      return;
    }
    try {
      await update.mutateAsync({ id: s._id, enabled: !s.enabled });
      toast.success(!s.enabled ? 'Section enabled' : 'Section disabled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveEdit = async () => {
    try {
      const saved = await update.mutateAsync({ id: editing._id, name: editing.name, theme: editing.theme, layout: editing.layout, content: editing.content });
      setEditing(saved);
      toast.success(saved.status === 'published' ? 'Saved — live on the homepage' : 'Section saved');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const add = async () => {
    try {
      const created = await create.mutateAsync({ type: adding.type, name: adding.name || typeLabel(adding.type), content: {}, theme: 'light', enabled: true });
      setAdding(null);
      setEditing(created);
      toast.success('Section added as a draft');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const del = async (s) => {
    if (!(await confirm({ title: `Delete “${s.name}”?`, message: 'Only draft or archived sections can be deleted. Archive a live section first.', tone: 'danger', confirmLabel: 'Delete' }))) return;
    try {
      await remove.mutateAsync(s._id);
      setEditing(null);
      toast.success('Section deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Homepage"
        description="Use the arrows (or drag on desktop) to reorder. Visitors only see sections that are enabled and published." 
        actions={
          <>
            <Button href="/" variant="secondary" icon={ExternalLink}>
              View homepage
            </Button>
            {canEdit && (
              <Button icon={Plus} onClick={() => setAdding({ type: 'intro', name: '' })}>
                Add section
              </Button>
            )}
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="No sections yet" message="Add your first homepage section." />
      ) : (
        <div className="card overflow-hidden">
          <SortableList
            items={items}
            onReorder={canEdit ? onReorder : () => {}}
            renderItem={(s, { handle }, i) => (
              <div className={cx('flex items-center gap-3 border-b border-app-border px-3 py-3 last:border-0 sm:px-4', !s.enabled && 'opacity-60')}>
              {canEdit && <span className="hidden sm:block">{handle}</span>}
                {canEdit && (
                  <span className="flex shrink-0 flex-col">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`} className="rounded-md p-1 text-app-subtle hover:bg-app-muted hover:text-app-text disabled:opacity-25">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`} className="rounded-md p-1 text-app-subtle hover:bg-app-muted hover:text-app-text disabled:opacity-25">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </span>
                )}
                <span className="w-6 shrink-0 text-center font-mono text-xs text-app-subtle">{i + 1}</span>
                <button type="button" onClick={() => setEditing({ ...s })} className="min-w-0 flex-1 text-left">
                               <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-app-subtle">{typeLabel(s.type)}</span>
                  <span className="mt-1 block sm:hidden">
                    <StatusBadge status={s.status} />
                  </span>
                </button>
                  <span className="hidden sm:block">
                  <StatusBadge status={s.status} />
                </span>
                <Switch checked={s.enabled} onChange={() => toggleEnabled(s)} disabled={!canEdit} label={<span className="sr-only">Enabled</span>} />
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ ...s })} aria-label={`Edit ${s.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </div>
      )}

      <Modal
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        title="Add a homepage section"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={add}>
              Add section
            </Button>
          </>
        }
      >
        {adding && (
          <div className="space-y-4">
            <Select label="Section type" value={adding.type} onChange={(type) => setAdding((a) => ({ ...a, type }))} options={SECTION_TYPES} />
            <Input label="Name (for your reference)" value={adding.name} onChange={(e) => setAdding((a) => ({ ...a, name: e.target.value }))} placeholder={typeLabel(adding.type)} />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.name}
        description={editing && typeLabel(editing.type)}
        size="lg"
        footer={
          editing && (
            <>
              {can(P.CMS_DELETE) && ['draft', 'archived'].includes(editing.status) && (
                <Button variant="ghost" className="mr-auto text-status-danger" onClick={() => del(editing)}>
                  Delete
                </Button>
              )}
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Close
              </Button>
              {canEdit && (
                <Button loading={update.isPending} onClick={saveEdit}>
                  Save section
                </Button>
              )}
            </>
          )
        }
      >
        {editing && (
          <div className="space-y-6">
            <WorkflowBar
              item={editing}
              busy={transition.isPending}
              onTransition={async (body) => {
                const next = await transition.mutateAsync({ id: editing._id, ...body });
                setEditing(next);
              }}
            />
            <fieldset disabled={!canEdit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} />
                <Select
                  label="Background"
                  value={editing.theme}
                  onChange={(theme) => setEditing((s) => ({ ...s, theme }))}
                  options={[
                    { value: 'light', label: 'Off-white' },
                    { value: 'warm', label: 'Warm paper' },
                    { value: 'dark', label: 'Charcoal' },
                  ]}
                />
              </div>
              <SectionContentForm type={editing.type} content={editing.content} onChange={(content) => setEditing((s) => ({ ...s, content }))} />
            </fieldset>
          </div>
        )}
      </Modal>
    </>
  );
}
