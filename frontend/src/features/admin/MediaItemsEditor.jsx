import { useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MediaPicker from '../../components/admin/MediaPicker';
import SortableList from '../../components/admin/SortableList';
import { imageUrl } from '../../lib/images';

/** Ordered image list for production stills / behind-the-scenes. */
export default function MediaItemsEditor({ items = [], onChange, folder = 'productions' }) {
  const [open, setOpen] = useState(false);
  const withKeys = items.map((it, i) => ({ ...it, _key: it._key || it._id || `${it.image?.url}-${i}` }));
  const clean = (list) => list.map(({ _key, ...rest }) => rest);

  return (
    <div>
      {withKeys.length > 0 && (
        <SortableList
          items={withKeys}
          getId={(i) => i._key}
          layout="grid"
          onReorder={(next) => onChange(clean(next))}
          className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          renderItem={(item, { handle }, index) => (
            <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="relative aspect-[3/2] bg-app-muted">
                <img src={imageUrl(item.image, 400)} alt="" className="h-full w-full object-cover text-[0px]" loading="lazy" />
                <div className="absolute right-1.5 top-1.5 rounded-md bg-app-surface/90">{handle}</div>
              </div>
              <div className="flex items-center gap-1 p-2">
                <Input
                  value={item.caption || ''}
                  onChange={(e) => onChange(clean(withKeys.map((x, j) => (j === index ? { ...x, caption: e.target.value } : x))))}
                  placeholder="Caption"
                  aria-label={`Caption for image ${index + 1}`}
                  inputClassName="!h-9 text-sm"
                  className="flex-1"
                />
                <button type="button" onClick={() => onChange(clean(withKeys.filter((_, j) => j !== index)))} className="rounded-md p-2 text-status-danger hover:bg-status-danger/10" aria-label={`Remove image ${index + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        />
      )}
      <Button variant="secondary" size="sm" icon={ImagePlus} onClick={() => setOpen(true)}>
        Add images
      </Button>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        multiple
        folder={folder}
        onSelect={(images) => onChange([...items, ...images.map((image) => ({ kind: 'image', image, caption: '' }))])}
      />
    </div>
  );
}
