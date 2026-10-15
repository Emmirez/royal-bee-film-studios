import { useEffect, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Info, Pencil, Star, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Badge, EmptyState, ErrorState, PageLoader, Tabs } from '../../components/ui/Primitives';
import MediaPicker from '../../components/admin/MediaPicker';
import SortableList from '../../components/admin/SortableList';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useAdminList, useCrud } from './adminApi';
import { imageUrl } from '../../lib/images';
import { P } from '../../lib/permissions';
import { cx } from '../../lib/format';

const ACTION =
  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-app-border px-2 text-xs font-semibold text-app-text transition hover:bg-app-muted';

/**
 * Shared manager for image collections (ticker, founder gallery, studio gallery):
 * add from library/upload/URL, drag to reorder, edit captions, feature,
 * publish/unpublish and remove — each change goes through the permission-checked API.
 *
 * renderFields(draft, setDraft) renders the extra fields for the edit dialog.
 */
export default function ImageCollectionManager({ resource, folder, renderFields, defaults = {}, featureable = false, badge, aspect = 'aspect-[4/3]' }) {
  const { can } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList(resource, { limit: 200 });
  const { create, update, remove, reorder, publish, unpublish } = useCrud(resource);
  const [items, setItems] = useState([]);

  useEffect(() => setItems(data?.data || []), [data]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const canEdit = can(P.CMS_EDIT);
  const canPublish = can(P.CMS_PUBLISH);
  const canDelete = can(P.CMS_DELETE);
  const visible = items.filter((i) => (filter === 'all' ? true : filter === 'live' ? i.isPublished : !i.isPublished));

  const addImages = async (picked) => {
    const images = Array.isArray(picked) ? picked : [picked];
    let ok = 0;
    for (const image of images) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const created = await create.mutateAsync({ image, caption: '', ...defaults });
        const id = created?._id || created?.data?._id;
        // New images go live straight away when you're allowed to publish
        // eslint-disable-next-line no-await-in-loop
        if (canPublish && id) await publish.mutateAsync(id);
        ok += 1;
      } catch (err) {
        toast.error(err.message);
      }
    }
    if (ok) {
      const word = `${ok} image${ok > 1 ? 's' : ''}`;
      toast.success(canPublish ? `${word} added and live on the website` : `${word} added — ask an editor to publish ${ok > 1 ? 'them' : 'it'}`);
    }
  };

  const placeholders = items.filter((i) => i.image?.isPlaceholder);
  const removePlaceholders = async () => {
    const ok = await confirm({
      title: `Remove ${placeholders.length} sample photo${placeholders.length > 1 ? 's' : ''}?`,
      message: 'These are the temporary Unsplash photos added during setup. Your own photos are not affected.',
      tone: 'danger',
      confirmLabel: 'Remove samples',
    });
    if (!ok) return;
    let removed = 0;
    for (const item of placeholders) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await remove.mutateAsync(item._id);
        removed += 1;
      } catch (err) {
        toast.error(err.message);
      }
    }
    if (removed) toast.success(`${removed} sample photo${removed > 1 ? 's' : ''} removed`);
  };

  const onReorder = async (next) => {
    const prev = items;
    const ids = filter === 'all' ? next.map((i) => i._id) : [...next.map((i) => i._id), ...items.filter((i) => !next.includes(i)).map((i) => i._id)];
    setItems(ids.map((id) => items.find((i) => i._id === id)));
    try {
      await reorder.mutateAsync(ids);
    } catch (err) {
      setItems(prev);
      toast.error(err.message);
    }
  };

  const togglePublish = async (item) => {
    try {
      await (item.isPublished ? unpublish : publish).mutateAsync(item._id);
      toast.success(item.isPublished ? 'Hidden from the website' : 'Now visible on the website');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const del = async (item) => {
    if (!(await confirm({ title: 'Remove this image?', message: 'It will be removed from this collection. The file stays in the media library.', tone: 'danger', confirmLabel: 'Remove' }))) return;
    try {
      await remove.mutateAsync(item._id);
      toast.success('Image removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveEdit = async () => {
    const { _id, image, caption, ...rest } = editing;
    const body = { image, caption, ...Object.fromEntries(Object.entries(rest).filter(([k]) => !['isPublished', 'order', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', '__v'].includes(k))) };
    if (body.link?.production && typeof body.link.production === 'object') body.link.production = body.link.production._id;
    if (body.production && typeof body.production === 'object') body.production = body.production._id;
    try {
      await update.mutateAsync({ id: _id, ...body });
      toast.success('Changes saved');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const liveCount = items.filter((i) => i.isPublished).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: items.length },
            { value: 'live', label: 'Live', count: liveCount },
            { value: 'hidden', label: 'Hidden', count: items.length - liveCount },
          ]}
        />
        {canEdit && (
          <Button icon={ImagePlus} onClick={() => setPickerOpen(true)}>
            Add images
          </Button>
        )}
      </div>

      {canEdit && (
        <div className="mb-5 flex gap-3 rounded-2xl bg-app-muted px-4 py-3 text-sm text-app-subtle">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden />
          <p className="min-w-0">
            Click <strong className="text-app-text">Add images</strong> → <strong className="text-app-text">Upload</strong> and select as many photos as you like at once (hold Ctrl or Shift to pick several). New photos go live straight away. Use <strong className="text-app-text">Hide</strong> to take a photo off the website, or <strong className="text-app-text">Remove</strong> to delete it from this list.
          </p>
        </div>
      )}

      {canDelete && placeholders.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-text">
            <strong>{placeholders.length} sample photo{placeholders.length > 1 ? 's' : ''}</strong> (marked “Placeholder”) {placeholders.length > 1 ? 'are' : 'is'} still here from setup.
          </p>
          <Button size="sm" variant="secondary" icon={Trash2} onClick={removePlaceholders} className="shrink-0">
            Remove all samples
          </Button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={ImagePlus} title="No images here yet" message="Add images from the media library, upload new ones, or paste a URL." action={canEdit && <Button onClick={() => setPickerOpen(true)}>Add images</Button>} />
      ) : (
        <>
          <p className="mb-3 text-xs text-app-subtle">Drag the handle to reorder (or focus it and use Space + arrow keys). The website shows images in this order.</p>
          <SortableList
            items={visible}
            layout="grid"
            onReorder={canEdit ? onReorder : () => {}}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
            renderItem={(item, { handle }) => (
              <div className={cx('card overflow-hidden', !item.isPublished && 'opacity-70')}>
                <div className={cx('relative bg-app-muted', aspect)}>
                  <img src={imageUrl(item.image, 500)} alt={item.image?.alt || ''} loading="lazy" className="h-full w-full object-cover text-[0px]" />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    <Badge tone={item.isPublished ? 'success' : 'neutral'} dot>
                      {item.isPublished ? 'Live' : 'Hidden'}
                    </Badge>
                    {item.isFeatured && <Badge tone="gold">Featured</Badge>}
                    {item.image?.isPlaceholder && <Badge tone="warning">Placeholder</Badge>}
                    {badge?.(item)}
                  </div>
                  {canEdit && <div className="absolute right-2 top-2 rounded-md bg-app-surface/90">{handle}</div>}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{item.caption || <span className="text-app-subtle">No caption</span>}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {canEdit && (
                      <button type="button" className={ACTION} onClick={() => setEditing({ ...item })}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                    )}
                    {featureable && canEdit && (
                      <button
                        type="button"
                        className={ACTION}
                        onClick={() => update.mutateAsync({ id: item._id, isFeatured: !item.isFeatured }).catch((e) => toast.error(e.message))}
                        aria-pressed={item.isFeatured}
                      >
                        <Star className={cx('h-3.5 w-3.5', item.isFeatured && 'fill-app-accent text-app-accent')} aria-hidden />
                        {item.isFeatured ? 'Featured' : 'Feature'}
                      </button>
                    )}
                    {canPublish && (
                      <button type="button" className={ACTION} onClick={() => togglePublish(item)}>
                        {item.isPublished ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                        {item.isPublished ? 'Hide' : 'Show'}
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" className={cx(ACTION, 'text-status-danger hover:bg-status-danger/10')} onClick={() => del(item)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </>
      )}

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} folder={folder} multiple onSelect={addImages} title="Add images" />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Image details"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={saveEdit}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <img src={imageUrl(editing.image, 600)} alt="" className="w-full rounded-xl object-cover" />
            <div className="space-y-4">
              <Input label="Caption" value={editing.caption || ''} onChange={(e) => setEditing((d) => ({ ...d, caption: e.target.value }))} maxLength={240} />
              <Input label="Alt text" value={editing.image?.alt || ''} onChange={(e) => setEditing((d) => ({ ...d, image: { ...d.image, alt: e.target.value } }))} hint="Describe the image for screen-reader users." />
              {renderFields?.(editing, setEditing)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}