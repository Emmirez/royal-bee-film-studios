import Select from '../../../components/ui/Select';
import { PageHeader } from '../../../components/ui/Primitives';
import Button from '../../../components/ui/Button';
import ImageCollectionManager from '../../../features/admin/ImageCollectionManager';

const CATEGORIES = [
  { value: 'portrait', label: 'Professional portrait' },
  { value: 'studio', label: 'Studio activity' },
  { value: 'on_set', label: 'On set' },
  { value: 'behind_the_scenes', label: 'Behind the scenes' },
  { value: 'press', label: 'Press & events' },
];

/** Founder photo gallery: upload, caption, reorder, feature (homepage spotlight), publish, remove. */
export default function FounderGalleryAdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Website · Founder"
        title="Founder gallery"
        description="Approved photos for the founder page. Featured photos also appear in the homepage founder spotlight. Only use images you have permission to publish."
        actions={<Button href="/about/founder" variant="secondary">View founder page</Button>}
      />
      <ImageCollectionManager
        resource="/cms/founder-gallery"
        folder="founder"
        featureable
        defaults={{ category: 'portrait' }}
        aspect="aspect-[4/5]"
        renderFields={(d, set) => <Select label="Category" value={d.category || 'portrait'} onChange={(v) => set((x) => ({ ...x, category: v }))} options={CATEGORIES} />}
      />
    </>
  );
}
