import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Search, Trash2, UploadCloud } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, Tabs } from '../../components/ui/Primitives';
import MediaPicker from '../../components/admin/MediaPicker';
import { useAdminList, useAdminMutation } from '../../features/admin/adminApi';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { imageUrl } from '../../lib/images';
import { P } from '../../lib/permissions';
import { formatBytes, formatDate } from '../../lib/format';

const FOLDERS = ['', 'hero', 'ticker', 'founder', 'gallery', 'services', 'productions', 'news', 'general', 'staff', 'projects'];

function AssetDetails({ asset, onClose }) {
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [alt, setAlt] = useState(asset.alt || '');
  const [caption, setCaption] = useState(asset.caption || '');
  const { data: usage = [], isLoading } = useQuery({ queryKey: ['admin', '/media', 'usage', asset._id], queryFn: async () => (await api.get(`/media/${asset._id}/usage`)).data });
  const save = useAdminMutation('/media', () => api.patch(`/media/${asset._id}`, { alt, caption }));
  const del = useAdminMutation('/media', (force) => api.del(`/media/${asset._id}`, { query: force ? { force: 'true' } : undefined }));

  const remove = async () => {
    const inUse = usage.length > 0;
    const ok = await confirm({
      title: inUse ? 'This file is still in use' : 'Delete this file?',
      message: inUse ? `It’s used in ${usage.length} place(s). Deleting it will break those images on the website. This can’t be undone.` : 'The file will be permanently deleted from Cloudinary.',
      tone: 'danger',
      confirmLabel: inUse ? 'Delete anyway' : 'Delete',
      typeToConfirm: inUse ? 'DELETE' : undefined,
    });
    if (!ok) return;
    try {
      await del.mutateAsync(inUse);
      toast.success('File deleted');
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={asset.originalFilename || 'Media file'}
      size="lg"
      footer={
        <>
          {can(P.MEDIA_DELETE) && (
            <Button variant="ghost" icon={Trash2} className="mr-auto text-status-danger" onClick={remove} loading={del.isPending}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {can(P.MEDIA_UPLOAD) && (
            <Button loading={save.isPending} onClick={() => save.mutateAsync().then(() => toast.success('Saved')).catch((e) => toast.error(e.message))}>
              Save
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {asset.resourceType === 'video' ? <video src={asset.url} controls className="w-full rounded-xl" /> : <img src={imageUrl(asset, 900)} alt={alt} className="w-full rounded-xl" />}
        <div className="space-y-4 text-sm">
          <Input label="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <Input label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <dl className="grid grid-cols-2 gap-2 text-app-subtle">
            <dt>Type</dt>
            <dd className="text-app-text">{asset.resourceType} · {asset.format}</dd>
            {asset.width && (
              <>
                <dt>Size</dt>
                <dd className="text-app-text tabular">{asset.width}×{asset.height}</dd>
              </>
            )}
            <dt>File size</dt>
            <dd className="text-app-text">{formatBytes(asset.bytes)}</dd>
            <dt>Uploaded</dt>
            <dd className="text-app-text">{formatDate(asset.createdAt)}</dd>
          </dl>
          <Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(asset.url).then(() => toast.success('URL copied'))}>
            Copy URL
          </Button>
          <div>
            <p className="field-label">Used in</p>
            {isLoading ? <p className="text-app-subtle">Checking…</p> : usage.length === 0 ? <p className="text-app-subtle">Not used anywhere.</p> : (
              <ul className="space-y-1">
                {usage.map((u) => (
                  <li key={`${u.type}-${u.id}`} className="flex items-center gap-2">
                    <Badge tone="info">{u.type}</Badge> {u.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function MediaLibraryPage() {
  const { can } = useAuth();
  const [type, setType] = useState('');
  const [folder, setFolder] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/media', { type, folder, q, page, limit: 40 });
  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Media library"
        description="Uploaded images and videos, optimized and delivered through Cloudinary."
        actions={can(P.MEDIA_UPLOAD) && <Button icon={UploadCloud} onClick={() => setUploadOpen(true)}>Upload</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={type} onChange={(v) => { setType(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }, { value: 'raw', label: 'Documents' }]} />
        <Select value={folder} onChange={(v) => { setFolder(v || ''); setPage(1); }} options={FOLDERS.map((f) => ({ value: f, label: f ? f[0].toUpperCase() + f.slice(1) : 'All folders' }))} className="lg:w-48" size="sm" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search files…" prefix={<Search className="h-4 w-4" />} className="lg:ml-auto lg:w-72" aria-label="Search media" />
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={UploadCloud} title="No files yet" message="Uploads need Cloudinary configured on the server. Placeholder Unsplash images used by the seed content don’t appear here." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((a) => (
            <li key={a._id}>
              <button type="button" onClick={() => setSelected(a)} className="card group block w-full overflow-hidden text-left">
                <div className="aspect-square bg-app-muted">
                  {a.resourceType === 'video' ? <video src={a.url} muted className="h-full w-full object-cover" /> : a.resourceType === 'raw' ? <div className="flex h-full items-center justify-center text-xs uppercase text-app-subtle">{a.format || 'file'}</div> : <img src={imageUrl(a, 400)} alt={a.alt || ''} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <p className="truncate px-3 py-2 text-xs text-app-subtle">{a.originalFilename || a.publicId}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      <MediaPicker open={uploadOpen} onClose={() => { setUploadOpen(false); refetch(); }} multiple onSelect={() => refetch()} title="Upload media" />
      {selected && <AssetDetails asset={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
