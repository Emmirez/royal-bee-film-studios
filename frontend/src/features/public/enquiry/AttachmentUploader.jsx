import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatBytes } from '../../../lib/format';

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Optional supporting files. Each file is uploaded privately and the API returns
 * a signed token that is sent with the enquiry (files are never public).
 */
export default function AttachmentUploader({ files, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState([]);
  const [error, setError] = useState('');

  const handle = async (list) => {
    setError('');
    const chosen = [...list].slice(0, MAX_FILES - files.length);
    for (const file of chosen) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      setUploading((u) => [...u, file.name]);
      try {
        const form = new FormData();
        form.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.upload('/public/enquiries/attachments', form);
        onChange((prev) => [...prev, { token: data.token, name: data.name, size: data.size }]);
      } catch (err) {
        setError(err.code === 'CLOUDINARY_NOT_CONFIGURED' ? 'File uploads are not available yet — please describe your files in the project details or send them after we reply.' : err.message);
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <p className="field-label">Supporting files (optional)</p>
      <p className="mb-3 text-xs text-ink-500">Scripts, treatments, mood boards or references — PDF, Word or images, up to 10 MB each, {MAX_FILES} files max.</p>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-paper-400 bg-paper-50 px-6 py-8 text-center transition hover:border-ink-900"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files);
        }}
      >
        <Paperclip className="h-6 w-6 text-gold-700" aria-hidden />
        <span className="text-sm font-semibold text-ink-900">Choose files or drag them here</span>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" disabled={files.length >= MAX_FILES} onChange={(e) => handle(e.target.files)} />
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {(files.length > 0 || uploading.length > 0) && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li key={f.token} className="flex items-center gap-3 rounded-xl border border-paper-300 bg-white px-4 py-3 text-sm">
              <FileText className="h-4 w-4 text-ink-500" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-ink-500">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onChange((prev) => prev.filter((_, j) => j !== i))} className="rounded-full p-1 text-ink-500 hover:bg-paper-200" aria-label={`Remove ${f.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {uploading.map((name) => (
            <li key={name} className="flex items-center gap-3 rounded-xl border border-paper-300 bg-white px-4 py-3 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uploading {name}…
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
