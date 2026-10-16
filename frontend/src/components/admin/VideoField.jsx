import { useRef, useState } from 'react';
import { UploadCloud, Film, Trash2 } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { api } from '../../lib/api';
import { useConfirm } from '../../context/ConfirmContext';
import { embedUrl, videoFileUrl } from '../../lib/images';

const MAX_MB = 100; // Cloudinary free plan limit per video

const TYPES = [
  { value: 'cloudinary', label: 'Upload from your device', description: 'Recommended — MP4, WebM or MOV up to 100MB' },
  { value: 'youtube', label: 'YouTube link' },
  { value: 'vimeo', label: 'Vimeo link' },
  { value: 'url', label: 'Other video URL (.mp4)' },
  { value: 'local', label: 'Website folder file', description: 'Advanced — e.g. /images/hero-video.mp4' },
  { value: 'none', label: 'No video (poster image only)' },
];

/**
 * Video source picker. Cloudinary uploads go straight from the browser to
 * Cloudinary using a short-lived server signature, then get registered.
 */
export default function VideoField({ value = {}, onChange, folder = 'hero', allowNone = true, label = 'Video source', showMobile = false }) {
  const [progress, setProgress] = useState(null);
  const [mobileTarget, setMobileTarget] = useState(false); // true while uploading the phone version
  const [error, setError] = useState('');
  const confirm = useConfirm();
  const fileRef = useRef(null);
  const mobileFileRef = useRef(null);
  const type = value.type || 'cloudinary';
  // Don't preview an old file path after switching to "upload" when nothing is uploaded yet
  const preview = ['youtube', 'vimeo'].includes(type) ? embedUrl(value) : type === 'cloudinary' && !value.publicId ? null : videoFileUrl({ ...value, type });

  const upload = async (file, forMobile = false) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`This file is ${Math.round(file.size / 1024 / 1024)}MB. Please use a video under ${MAX_MB}MB (export at 1080p, or 720p for phones).`);
      return;
    }
    setMobileTarget(forMobile);
    try {
      const { data: sig } = await api.post('/media/sign', { folder, resourceType: 'video' });
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', sig.timestamp);
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);
      form.append('tags', sig.tags);
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', sig.uploadUrl);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(JSON.parse(xhr.responseText)?.error?.message || 'Upload failed')));
        xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
        xhr.send(form);
      });
      const { data: asset } = await api.post('/media/register', { publicId: result.public_id, resourceType: 'video' });
      if (forMobile) onChange({ ...value, mobileUrl: asset.url });
      else onChange({ ...value, type: 'cloudinary', url: asset.url, publicId: asset.publicId });
    } catch (err) {
      setError(err.code === 'CLOUDINARY_NOT_CONFIGURED' ? 'Video uploads need Cloudinary, which is not set up on the server yet. Use a YouTube or Vimeo link for now.' : err.message);
    } finally {
      setProgress(null);
      setMobileTarget(false);
      if (fileRef.current) fileRef.current.value = '';
      if (mobileFileRef.current) mobileFileRef.current.value = '';
    }
  };

   const hasVideo = type !== 'none' && Boolean(value.url || value.publicId);

  /** Remove the video — the section falls back to the poster / fallback image. */
  const removeVideo = async () => {
    const ok = await confirm({
      title: 'Delete this video?',
      message: 'The video is removed from this section and the poster / fallback image is shown instead. The file stays in your media library, so you can use it again later.',
      tone: 'danger',
      confirmLabel: 'Delete video',
    });
    if (!ok) return;
    setError('');
    onChange({ type: 'none', url: '', publicId: '', mobileUrl: '' });
  };

  return (
    <div className="space-y-4">
           <Select label={label} value={type} onChange={(t) => { setError(''); onChange({ ...value, type: t }); }} options={allowNone ? TYPES : TYPES.filter((t) => t.value !== 'none')} />

      {type === 'local' && (
        <Input label="File path" value={value.url || ''} onChange={(e) => onChange({ ...value, url: e.target.value })} placeholder="/images/hero-video.mp4" hint="Only if the video file is already in the frontend public/images folder." />
      )}
      {['youtube', 'vimeo', 'url'].includes(type) && (
        <Input label="Link" value={value.url || ''} onChange={(e) => onChange({ ...value, url: e.target.value })} placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=…' : type === 'vimeo' ? 'https://vimeo.com/…' : 'https://…/video.mp4'} />
      )}
      {type === 'cloudinary' && (
        <div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-app-border px-4 py-4 text-sm hover:border-app-accent">
            <UploadCloud className="h-5 w-5 text-app-accent" aria-hidden />
                      <span className="min-w-0 flex-1">{progress !== null && !mobileTarget ? `Uploading… ${progress}%` : value.publicId ? 'Replace the video' : 'Click to upload a video (MP4, WebM or MOV, up to 100MB)'}</span>  
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"   disabled={progress !== null} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
            {progress !== null && !mobileTarget && (
            <div className="mt-2 h-1.5  overflow-hidden rounded-full bg-app-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-app-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {value.publicId && <p className="field-hint break-all">Uploaded: {value.publicId.split('/').pop()}</p>}  
        </div>
      )}
           {showMobile && type === 'cloudinary' && (
        <div>
          <p className="field-label">Lighter mobile video (optional)</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-app-border px-4 py-4 text-sm hover:border-app-accent">
            <UploadCloud className="h-5 w-5 text-app-accent" aria-hidden />
            <span className="min-w-0 flex-1">{progress !== null && mobileTarget ? `Uploading… ${progress}%` : value.mobileUrl ? 'Replace the phone version' : 'Click to upload a smaller video for phones'}</span>
           <input ref={mobileFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"  disabled={progress !== null} onChange={(e) => upload(e.target.files?.[0], true)} />
          </label>
          {progress !== null && mobileTarget && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-app-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {value.mobileUrl && (
            <p className="field-hint break-all">
              Phone version: {value.mobileUrl.split('/').pop()}{' '}
              <button type="button" onClick={() => onChange({ ...value, mobileUrl: '' })} className="font-semibold text-status-danger hover:underline">
                Remove
              </button>
            </p>
          )}
          <p className="field-hint">Used on phones when “On phones” is set to “lighter mobile video”. 720p and under 15MB is ideal.</p>
        </div>
      )}
      {showMobile && ['local', 'url'].includes(type) && (
        <Input label="Lighter mobile video (optional)" value={value.mobileUrl || ''} onChange={(e) => onChange({ ...value, mobileUrl: e.target.value })} placeholder="/images/hero-video-mobile.mp4" hint="A smaller file for phones. Used when mobile behaviour is “lighter mobile video”." />
      )}
           {hasVideo && (
        <button type="button" onClick={removeVideo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-status-danger hover:underline">
          <Trash2 className="h-4 w-4" aria-hidden /> Delete video (show the poster image instead)
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {preview && type !== 'none' && (
        <div className="overflow-hidden rounded-xl border border-app-border bg-black">
          {['youtube', 'vimeo'].includes(type) ? (
            <iframe src={preview} title="Video preview" className="aspect-video w-full" allow="fullscreen" />
          ) : (
            <video key={preview} src={preview} controls muted playsInline className="aspect-video w-full" onError={() => setError('This video could not be loaded — check the path or link.')} />
          )}
        </div>
      )}
      {!preview && type !== 'none' && (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-app-border text-app-subtle">
          <Film className="h-8 w-8" aria-hidden />
        </div>
      )}
    </div>
  );
}
