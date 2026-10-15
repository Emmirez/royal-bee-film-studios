import Input from '../../../components/ui/Input';
import CommaListInput from '../../../components/ui/CommaListInput';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { Card, Switch } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import VideoField from '../../../components/admin/VideoField';
import { ListEditor } from '../../../components/admin/ListEditor';
import ContentEditor from '../../../features/admin/ContentEditor';
import MediaItemsEditor from '../../../features/admin/MediaItemsEditor';
import SeoFields from '../../../features/admin/SeoFields';
import { useOptions } from '../../../features/admin/adminApi';

const CATEGORIES = ['Feature Film', 'Short Film', 'Documentary', 'Series', 'Commercial', 'Music Video', 'Brand Film', 'Corporate'];

const EMPTY = {
  title: '',
  logline: '',
  synopsis: '',
  category: 'Feature Film',
  tags: [],
  year: new Date().getFullYear(),
  releaseDate: '',
  runtimeMinutes: null,
  clientName: '',
  showClientName: false,
  credits: [],
  coverImage: { url: '', alt: '' },
  trailer: { type: 'none', url: '' },
  gallery: [],
  behindTheScenes: [],
  services: [],
  relatedProductions: [],
  isFeatured: false,
  visibility: 'public',
  isPlaceholder: false,
  seo: {},
};

const TABS = [
  { value: 'basics', label: 'Basics' },
  { value: 'media', label: 'Images & trailer' },
  { value: 'credits', label: 'Credits & client' },
  { value: 'links', label: 'Visibility & links' },
  { value: 'seo', label: 'SEO' },
];

const ids = (list) => (list || []).map((x) => (typeof x === 'object' ? x._id : x));
const media = (list) => (list || []).map(({ _id, ...m }) => m);

export default function ProductionEditorPage() {
  const serviceOptions = useOptions('/cms/services');
  const productionOptions = useOptions('/cms/productions');

  return (
    <ContentEditor
      resource="/cms/productions"
      basePath="/admin/website/productions"
      publicPath="/productions"
      label="Production"
      empty={EMPTY}
      tabs={TABS}
      toForm={(d) => ({ ...EMPTY, ...d, releaseDate: d.releaseDate ? String(d.releaseDate).slice(0, 10) : '', services: ids(d.services), relatedProductions: ids(d.relatedProductions) })}
      toPayload={(f) => ({
        title: f.title,
        slug: f.slug,
        logline: f.logline,
        synopsis: f.synopsis,
        category: f.category,
        tags: f.tags,
        year: f.year ? Number(f.year) : null,
        releaseDate: f.releaseDate || null,
        runtimeMinutes: f.runtimeMinutes ? Number(f.runtimeMinutes) : null,
        clientName: f.clientName,
        showClientName: f.showClientName,
        credits: (f.credits || []).map(({ role, name }) => ({ role, name })),
        coverImage: f.coverImage,
        trailer: f.trailer,
        gallery: media(f.gallery),
        behindTheScenes: media(f.behindTheScenes),
        services: f.services,
        relatedProductions: f.relatedProductions,
        isFeatured: f.isFeatured,
        visibility: f.visibility,
        isPlaceholder: f.isPlaceholder,
        seo: f.seo,
      })}
      renderTab={(tab, form, errors) => {
        const v = form.value;
        const set = form.set;
        if (tab === 'basics')
          return (
            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card title="Production">
                <div className="space-y-5">
                  <Input label="Title" required value={v.title} onChange={(e) => set('title', e.target.value)} error={errors.title} maxLength={160} />
                  <Input label="URL slug" value={v.slug || ''} onChange={(e) => set('slug', e.target.value)} hint="Leave empty to generate from the title." />
                  <Textarea label="Logline" rows={2} value={v.logline} onChange={(e) => set('logline', e.target.value)} maxLength={300} />
                  <Textarea label="Synopsis" rows={8} value={v.synopsis} onChange={(e) => set('synopsis', e.target.value)} maxLength={6000} />
                </div>
              </Card>
              <Card title="Details">
                <div className="space-y-5">
                  <Select label="Category" value={v.category} onChange={(x) => set('category', x)} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Year" type="number" value={v.year ?? ''} onChange={(e) => set('year', e.target.value === '' ? null : Number(e.target.value))} error={errors.year} />
                    <Input label="Runtime (min)" type="number" min={0} value={v.runtimeMinutes ?? ''} onChange={(e) => set('runtimeMinutes', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <Input label="Release date" type="date" value={v.releaseDate || ''} onChange={(e) => set('releaseDate', e.target.value)} />
                  <CommaListInput label="Tags (comma separated)" value={v.tags || []} onChange={(x) => set('tags', x)} max={20} />
                  <Switch checked={v.isFeatured} onChange={(x) => set('isFeatured', x)} label="Featured" description="Shown first on the homepage and portfolio." />
                  <Switch checked={v.isPlaceholder} onChange={(x) => set('isPlaceholder', x)} label="Sample content" description="Labels this as a sample on the website." />
                </div>
              </Card>
            </div>
          );
        if (tab === 'media')
          return (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <Card title="Cover image">
                  <ImageField value={v.coverImage} onChange={(x) => set('coverImage', x)} folder="productions" />
                </Card>
                <Card title="Trailer or preview">
                  <VideoField value={v.trailer} onChange={(x) => set('trailer', x)} folder="productions" label="Trailer source" />
                </Card>
              </div>
              <Card title="Production stills">
                <MediaItemsEditor items={v.gallery} onChange={(x) => set('gallery', x)} />
              </Card>
              <Card title="Behind the scenes">
                <MediaItemsEditor items={v.behindTheScenes} onChange={(x) => set('behindTheScenes', x)} />
              </Card>
            </div>
          );
        if (tab === 'credits')
          return (
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card title="Credits" description="Only list credits that are approved for publication.">
                <ListEditor
                  items={v.credits}
                  onChange={(x) => set('credits', x)}
                  max={60}
                  addLabel="Add credit"
                  newItem={{ role: '', name: '' }}
                  renderRow={(row, update) => (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Role" value={row.role} onChange={(e) => update({ role: e.target.value })} placeholder="Director" />
                      <Input label="Name" value={row.name} onChange={(e) => update({ name: e.target.value })} />
                    </div>
                  )}
                />
              </Card>
              <Card title="Client">
                <div className="space-y-5">
                  <Input label="Client name" value={v.clientName} onChange={(e) => set('clientName', e.target.value)} />
                  <Switch checked={v.showClientName} onChange={(x) => set('showClientName', x)} label="Show client name publicly" description="Only with the client’s permission." />
                </div>
              </Card>
            </div>
          );
        if (tab === 'links')
          return (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Visibility">
                <Select
                  label="Who can see this once published"
                  value={v.visibility}
                  onChange={(x) => set('visibility', x)}
                  options={[
                    { value: 'public', label: 'Public', description: 'Listed in the portfolio and search' },
                    { value: 'unlisted', label: 'Unlisted', description: 'Only people with the link' },
                    { value: 'private', label: 'Private', description: 'Never shown on the website' },
                  ]}
                />
              </Card>
              <Card title="Related content">
                <div className="space-y-5">
                  <Select label="Services" multiple searchable value={v.services} onChange={(x) => set('services', x)} options={serviceOptions} />
                  <Select label="Related productions" multiple searchable value={v.relatedProductions} onChange={(x) => set('relatedProductions', x)} options={productionOptions.filter((o) => o.value !== v._id)} />
                </div>
              </Card>
            </div>
          );
        return (
          <Card title="Search engines">
            <SeoFields value={v.seo} onChange={(x) => set('seo', x)} fallbackTitle={v.title} fallbackDescription={v.logline} />
          </Card>
        );
      }}
    />
  );
}
