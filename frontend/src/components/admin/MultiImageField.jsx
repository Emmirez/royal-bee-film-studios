import { useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import MediaPicker from './MediaPicker';
import { imageUrl } from '../../lib/images';

/**
 * Several photos in one field: a grid of thumbnails plus an "Add photos" tile.
 * value: [{ image: { url, alt, ... }, caption }]
 */
export default function MultiImageField({ label, value = [], onChange, max = 6, folder = 'general', hint }) {
  const [open, setOpen] = useState(false);
  const photos = (value || []).filter((p) => p?.image?.url);
  const left = max - photos.length;

  const add = (picked) => {
    const list = (Array.isArray(picked) ? picked : [picked]).filter(Boolean);
    onChange([...photos, ...list.map((image) => ({ image, caption: '' }))].slice(0, max));
  };
  const update = (i, patch) => onChange(photos.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const remove = (i) => onChange(photos.filter((_, j) => j !== i));
  const move = (i, d) => {
    const next = [...photos];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        {label && <p className="field-label mb-0">{label}</p>}
        <span className="text-xs text-app-subtle tabular">
          {photos.length} of {max}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <li key={`${p.image.url}-${i}`} className="min-w-0 overflow-hidden rounded-xl border border-app-border bg-app-raised">
            <div className="relative aspect-[4/3] bg-app-muted">
              <img src={imageUrl(p.image, 400)} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-app-surface/90 px-2 py-0.5 text-[11px] font-semibold">Large photo</span>
              )}
            </div>
            <div className="space-y-2 p-2">
              <input
                value={p.caption || ''}
                onChange={(e) => update(i, { caption: e.target.value })}
                placeholder="Caption (optional)"
                maxLength={160}
                aria-label={`Caption for photo ${i + 1}`}
                className="h-8 w-full rounded-lg border border-app-border bg-app-surface px-2 text-xs text-app-text placeholder:text-app-subtle focus:outline-none focus:ring-2 focus:ring-app-accent/40"
              />
              <div className="flex items-center gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-app-subtle hover:bg-app-muted disabled:opacity-30" aria-label="Move earlier">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-app-subtle hover:bg-app-muted disabled:opacity-30" aria-label="Move later">
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(i)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-status-danger hover:bg-status-danger/10">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
            </div>
          </li>
        ))}

        {left > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-app-border bg-app-muted text-sm font-semibold text-app-subtle transition hover:border-app-accent hover:text-app-text"
            >
              <ImagePlus className="h-6 w-6" aria-hidden />
              Add photos
              <span className="text-xs font-normal">{left} more allowed</span>
            </button>
          </li>
        )}
      </ul>

      {hint && <p className="field-hint mt-2">{hint}</p>}

      <MediaPicker open={open} onClose={() => setOpen(false)} folder={folder} multiple onSelect={add} title="Add photos" />
    </div>
  );
}