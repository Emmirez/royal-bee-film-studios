import Input from '../../../components/ui/Input';
import CommaListInput from '../../../components/ui/CommaListInput';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { Card, Switch } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { ListEditor } from '../../../components/admin/ListEditor';
import ContentEditor from '../../../features/admin/ContentEditor';
import SeoFields from '../../../features/admin/SeoFields';

const EMPTY = {
  title: '',
  excerpt: '',
  category: 'Studio News',
  tags: [],
  authorName: 'Royal Bee Studios',
  coverImage: { url: '', alt: '' },
  body: [{ type: 'paragraph', text: '' }],
  isFeatured: false,
  isPlaceholder: false,
  seo: {},
};

const TABS = [
  { value: 'article', label: 'Article' },
  { value: 'details', label: 'Details' },
  { value: 'seo', label: 'SEO' },
];

export default function NewsEditorPage() {
  return (
    <ContentEditor
      resource="/cms/news"
      basePath="/admin/website/news"
      publicPath="/news"
      label="Article"
      empty={EMPTY}
      tabs={TABS}
      toForm={(d) => ({ ...EMPTY, ...d })}
      toPayload={(f) => ({
        title: f.title,
        slug: f.slug,
        excerpt: f.excerpt,
        category: f.category,
        tags: f.tags,
        authorName: f.authorName,
        coverImage: f.coverImage,
        body: (f.body || []).filter((b) => b.text || b.image?.url).map(({ type, text, image }) => ({ type, text, ...(image?.url ? { image } : {}) })),
        isFeatured: f.isFeatured,
        isPlaceholder: f.isPlaceholder,
        seo: f.seo,
      })}
      renderTab={(tab, form, errors) => {
        const v = form.value;
        const set = form.set;
        if (tab === 'article')
          return (
            <div className="space-y-6">
              <Card>
                <div className="space-y-5">
                  <Input label="Headline" required value={v.title} onChange={(e) => set('title', e.target.value)} error={errors.title} maxLength={180} inputClassName="text-lg font-semibold" />
                  <Textarea label="Excerpt" rows={2} value={v.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={400} hint="Shown on cards and as the article intro." />
                  <ImageField label="Cover image" value={v.coverImage} onChange={(x) => set('coverImage', x)} folder="news" />
                </div>
              </Card>
              <Card title="Body" description="Build the article from blocks. Text is shown exactly as written (no HTML).">
                <ListEditor
                  items={v.body}
                  onChange={(x) => set('body', x)}
                  max={200}
                  addLabel="Add block"
                  newItem={{ type: 'paragraph', text: '' }}
                  renderRow={(row, update) => (
                    <>
                      <Select
                        size="sm"
                        value={row.type}
                        onChange={(x) => update({ type: x })}
                        className="max-w-[200px]"
                        options={[
                          { value: 'paragraph', label: 'Paragraph' },
                          { value: 'heading', label: 'Heading' },
                          { value: 'quote', label: 'Quote' },
                          { value: 'image', label: 'Image' },
                        ]}
                      />
                      {row.type === 'image' && <ImageField value={row.image} onChange={(img) => update({ image: img })} folder="news" />}
                      {row.type === 'heading' ? (
                        <Input value={row.text} onChange={(e) => update({ text: e.target.value })} placeholder="Heading" aria-label="Heading text" />
                      ) : (
                        <Textarea rows={row.type === 'image' ? 2 : 5} value={row.text} onChange={(e) => update({ text: e.target.value })} placeholder={row.type === 'image' ? 'Caption (optional)' : row.type === 'quote' ? 'Quote' : 'Write a paragraph…'} aria-label={`${row.type} text`} />
                      )}
                    </>
                  )}
                />
              </Card>
            </div>
          );
        if (tab === 'details')
          return (
            <Card title="Details">
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Category" value={v.category} onChange={(e) => set('category', e.target.value)} maxLength={60} hint="e.g. Studio News, Announcements" />
                <Input label="Author" value={v.authorName} onChange={(e) => set('authorName', e.target.value)} maxLength={80} />
                <CommaListInput label="Tags (comma separated)" value={v.tags || []} onChange={(x) => set('tags', x)} max={20} className="md:col-span-2" />
                <Switch checked={v.isFeatured} onChange={(x) => set('isFeatured', x)} label="Featured article" />
                <Switch checked={v.isPlaceholder} onChange={(x) => set('isPlaceholder', x)} label="Sample content" />
              </div>
              <p className="mt-5 text-sm text-app-subtle">Schedule publication and expiry from the Publish button once the article is approved.</p>
            </Card>
          );
        return (
          <Card title="Search engines">
            <SeoFields value={v.seo} onChange={(x) => set('seo', x)} fallbackTitle={v.title} fallbackDescription={v.excerpt} />
          </Card>
        );
      }}
    />
  );
}
