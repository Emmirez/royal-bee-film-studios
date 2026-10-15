import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CloudOff, ImagePlus, Link2, Search, UploadCloud } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Tabs, Spinner } from '../ui/Primitives';
import { api } from '../../lib/api';
import { imageUrl } from '../../lib/images';
import { cx, formatBytes } from '../../lib/format';

const toImage = (asset) => ({
  url: asset.url,
  publicId: asset.publicId,
  alt: asset.alt || '',
  width: asset.width,
  height: asset.height,
  isPlaceholder: false,
});

/**
 * Choose media from the library, upload a new file (Cloudinary), or paste a URL
 * (Unsplash placeholder, an existing link, or a local /images/... path).
 * onSelect receives one image object, or an array when `multiple`.
 */
export default function MediaPicker({ open, onClose, onSelect, folder = 'general', type = 'image', multiple = false, title = 'Choose media' }) {
  const [tab, setTab] = useState('library');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', '/media', 'picker', type, q],
    queryFn: () => api.get('/media', { query: { type, q, limit: 60 } }),
    enabled: open && tab === 'library',
  });
  const assets = data?.data || [];

  const close = () => {
    setPicked([]);
    setUrl('');
    setAlt('');
    setUploadError('');
    onClose();
  };

  const finish = (images) => {
    onSelect(multiple ? images : images[0]);
    close();
  };

  const upload = async (files) => {
    setUploadError('');
    setUploading(true);
    const done = [];
    try {
      for (const file of [...files]) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folder);
        // eslint-disable-next-line no-await-in-loop
        const { data: asset } = await api.upload('/media/upload', form);
        done.push(toImage(asset));
        if (!multiple) break;
      }
      qc.invalidateQueries({ queryKey: ['admin', '/media'] });
      if (done.length) finish(done);
    } catch (err) {
      setUploadError(err.code === 'CLOUDINARY_NOT_CONFIGURED' ? 'Uploads need Cloudinary set up on the server. Use the “Paste URL” tab for now.' : err.message);
      if (done.length) finish(done);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const togglePick = (asset) => {
    if (!multiple) return finish([toImage(asset)]);
    setPicked((p) => (p.some((x) => x._id === asset._id) ? p.filter((x) => x._id !== asset._id) : [...p, asset]));
    return undefined;
  };

  const urlValid = /^(https?:\/\/|\/)/.test(url.trim());

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="xl"
      footer={
        tab === 'library' && multiple ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!picked.length} onClick={() => finish(picked.map(toImage))}>
              Add {picked.length || ''} selected
            </Button>
          </>
        ) : tab === 'url' ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!urlValid} onClick={() => finish([{ url: url.trim(), publicId: '', alt, isPlaceholder: url.includes('unsplash.com') }])}>
              Use this {type === 'video' ? 'video' : 'image'}
            </Button>
          </>
        ) : null
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5 w-fit"
        tabs={[
          { value: 'library', label: 'Library' },
          { value: 'upload', label: 'Upload' },
          { value: 'url', label: 'Paste URL' },
        ]}
      />

      {tab === 'library' && (
        <div>
          <Input placeholder="Search by name, alt text or tag…" value={q} onChange={(e) => setQ(e.target.value)} prefix={<Search className="h-4 w-4" />} className="mb-4" aria-label="Search media" />
          {isLoading ? (
            <div className="py-16 text-center">
              <Spinner />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-app-subtle">{error.message}</p>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center text-sm text-app-subtle">
              <CloudOff className="mb-3 h-8 w-8" aria-hidden />
              No uploads yet. Upload a file, or paste an image URL.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {assets.map((a) => {
                const isPicked = picked.some((x) => x._id === a._id);
                return (
                  <li key={a._id}>
                    <button
                      type="button"
                      onClick={() => togglePick(a)}
                      aria-pressed={multiple ? isPicked : undefined}
                      className={cx('group relative block w-full overflow-hidden rounded-xl border-2 bg-app-muted', isPicked ? 'border-app-accent' : 'border-transparent hover:border-app-border')}
                    >
                      {a.resourceType === 'video' ? (
                        <video src={a.url} muted className="aspect-square w-full object-cover" />
                      ) : (
                        <img src={imageUrl(a, 300)} alt={a.alt || a.originalFilename} loading="lazy" className="aspect-square w-full object-cover" />
                      )}
                      {isPicked && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-app-accent-ink">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-left text-xs text-app-subtle">{a.originalFilename || a.publicId}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-app-border px-6 py-16 text-center hover:border-app-accent"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {uploading ? <Spinner /> : <UploadCloud className="h-9 w-9 text-app-accent" aria-hidden />}
          <span className="font-semibold text-app-text">{uploading ? 'Uploading…' : `Choose ${multiple ? 'files' : 'a file'} or drag ${multiple ? 'them' : 'it'} here`}</span>
          <span className="text-xs text-app-subtle">{type === 'video' ? 'MP4, WebM or MOV — up to 100 MB' : 'JPG, PNG, WebP or AVIF — up to 15 MB'}. Images are optimized automatically.</span>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            multiple={multiple}
            accept={type === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/avif'}
            disabled={uploading}
            onChange={(e) => upload(e.target.files)}
          />
          {uploadError && (
            <span role="alert" className="mt-2 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
              {uploadError}
            </span>
          )}
        </label>
      )}

      {tab === 'url' && (
        <div className="grid gap-5 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <Input
              label={type === 'video' ? 'Video URL or path' : 'Image URL or path'}
              placeholder={type === 'video' ? '/images/hero-video.mp4 or https://…' : 'https://images.unsplash.com/… or /images/photo.jpg'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              prefix={<Link2 className="h-4 w-4" />}
              hint="Paths starting with / point to files in the frontend public folder."
              data-autofocus
            />
            {type !== 'video' && <Input label="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} hint="Describe the image for screen-reader users." />}
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-app-muted">
            {urlValid && type !== 'video' ? <img src={imageUrl(url.trim(), 500)} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-app-subtle" aria-hidden />}
          </div>
        </div>
      )}
    </Modal>
  );
}

export { formatBytes };
