import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { PageHeader } from '../../../components/ui/Primitives';
import ImageCollectionManager from '../../../features/admin/ImageCollectionManager';
import { useOptions } from '../../../features/admin/adminApi';

const CATEGORIES = [
  { value: 'studio', label: 'Studio' },
  { value: 'production', label: 'Production' },
  { value: 'behind_the_scenes', label: 'Behind the scenes' },
  { value: 'on_set', label: 'On set' },
  { value: 'crew', label: 'Crew' },
];

export default function GalleryAdminPage() {
  const productionOptions = useOptions('/cms/productions');
  return (
    <>
      <PageHeader eyebrow="Website" title="Studio gallery" description="Photos for the public gallery page, filterable by category." />
      <ImageCollectionManager
        resource="/cms/gallery"
        folder="gallery"
        featureable
        defaults={{ category: 'studio' }}
        renderFields={(d, set) => (
          <>
            <Textarea label="Description" rows={3} value={d.description || ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} maxLength={1000} />
            <Select label="Category" value={d.category || 'studio'} onChange={(v) => set((x) => ({ ...x, category: v }))} options={CATEGORIES} />
            <Select
              label="Related production (optional)"
              searchable
              clearable
              value={typeof d.production === 'object' ? d.production?._id : d.production}
              onChange={(v) => set((x) => ({ ...x, production: v }))}
              options={productionOptions}
            />
          </>
        )}
      />
    </>
  );
}
