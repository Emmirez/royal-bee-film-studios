import { useState } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Badge } from '../ui/Primitives';
import MediaPicker from './MediaPicker';
import { imageUrl } from '../../lib/images';
import { cx } from '../../lib/format';

/** Single image field with preview, replace/remove and alt text. */
export default function ImageField({ label, value, onChange, folder, hint, aspect = '16/9', className, withAlt = true }) {
  const [open, setOpen] = useState(false);
  const has = Boolean(value?.url);
  return (
    <div className={className}>
      {label && <p className="field-label">{label}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cx('relative w-full shrink-0 overflow-hidden rounded-xl border border-app-border bg-app-muted sm:w-56', !has && 'border-dashed')}
          style={{ aspectRatio: aspect }}
          aria-label={has ? `Change ${label || 'image'}` : `Choose ${label || 'image'}`}
        >
          {has ? (
            <img src={imageUrl(value, 500)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-app-subtle">
              <ImagePlus className="h-6 w-6" aria-hidden /> Choose image
            </span>
          )}
          {value?.isPlaceholder && (
            <Badge tone="warning" className="absolute left-2 top-2">
              Placeholder
            </Badge>
          )}
        </button>
        <div className="flex-1 space-y-3">
          {withAlt && has && <Input label="Alt text" value={value.alt || ''} onChange={(e) => onChange({ ...value, alt: e.target.value })} hint="Describe what the image shows." />}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={has ? RefreshCw : ImagePlus} onClick={() => setOpen(true)}>
              {has ? 'Replace' : 'Choose'}
            </Button>
            {has && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onChange({ url: '', publicId: '', alt: '' })}>
                Remove
              </Button>
            )}
          </div>
          {hint && <p className="field-hint">{hint}</p>}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} folder={folder} onSelect={(img) => onChange({ ...img, alt: img.alt || value?.alt || '' })} />
    </div>
  );
}
