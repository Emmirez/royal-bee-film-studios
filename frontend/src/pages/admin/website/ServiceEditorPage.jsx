import Input from '../../../components/ui/Input';
import CommaListInput from '../../../components/ui/CommaListInput';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { Card, Switch } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { ListEditor, StringListEditor } from '../../../components/admin/ListEditor';
import ContentEditor from '../../../features/admin/ContentEditor';
import SeoFields from '../../../features/admin/SeoFields';
import { useOptions } from '../../../features/admin/adminApi';
import { SERVICE_ICONS } from '../../../features/public/components/ServiceIcon';

const EMPTY = {
  title: '',
  summary: '',
  description: '',
  icon: 'Clapperboard',
  coverImage: { url: '', alt: '' },
  benefits: [],
  process: [],
  deliverables: [],
  startingPrice: { amount: null, currency: 'NGN', visible: false, note: 'Indicative only — final pricing is confirmed in a formal quotation.' },
  packages: [],
  addOns: [],
  faqs: [],
  testimonials: [],
  portfolio: [],
  enquiryQuestions: [],
  cta: { label: 'Start a project', href: '/enquire', variant: 'primary' },
  seo: {},
  isFeatured: false,
};

const TABS = [
  { value: 'basics', label: 'Basics' },
  { value: 'content', label: 'Content' },
  { value: 'pricing', label: 'Packages & pricing' },
  { value: 'faq', label: 'FAQs & testimonials' },
  { value: 'questions', label: 'Enquiry questions' },
  { value: 'seo', label: 'Portfolio & SEO' },
];

const ids = (list) => (list || []).map((x) => (typeof x === 'object' ? x._id : x));
const strip = (list) => (list || []).map(({ _id, ...rest }) => rest);

export default function ServiceEditorPage() {
  const productionOptions = useOptions('/cms/productions');

  return (
    <ContentEditor
      resource="/cms/services"
      basePath="/admin/website/services"
      publicPath="/services"
      label="Service"
      empty={EMPTY}
      tabs={TABS}
      toForm={(d) => ({ ...EMPTY, ...d, portfolio: ids(d.portfolio) })}
      toPayload={(f) => ({
        title: f.title,
        slug: f.slug,
        summary: f.summary,
        description: f.description,
        icon: f.icon,
        coverImage: f.coverImage,
        benefits: f.benefits.filter(Boolean),
        process: strip(f.process),
        deliverables: f.deliverables.filter(Boolean),
        startingPrice: { ...f.startingPrice, amount: f.startingPrice?.amount === '' ? null : f.startingPrice?.amount ?? null },
        packages: strip(f.packages),
        addOns: strip(f.addOns),
        faqs: strip(f.faqs),
        testimonials: strip(f.testimonials),
        portfolio: f.portfolio,
        enquiryQuestions: f.enquiryQuestions,
        cta: f.cta,
        seo: f.seo,
        isFeatured: f.isFeatured,
      })}
      renderTab={(tab, form, errors) => {
        const v = form.value;
        const set = form.set;
        if (tab === 'basics')
          return (
            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card title="Service details">
                <div className="space-y-5">
                  <Input label="Title" required value={v.title} onChange={(e) => set('title', e.target.value)} error={errors.title} maxLength={120} />
                  <Input label="URL slug" value={v.slug || ''} onChange={(e) => set('slug', e.target.value)} hint="Leave empty to generate from the title." prefix="/services/" inputClassName="!pl-[88px]" />
                  <Textarea label="Summary" rows={2} value={v.summary} onChange={(e) => set('summary', e.target.value)} maxLength={300} hint="Shown on cards and in search results." />
                  <Textarea label="Description" rows={8} value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={6000} />
                </div>
              </Card>
              <Card title="Presentation">
                <div className="space-y-5">
                  <ImageField label="Cover image" value={v.coverImage} onChange={(x) => set('coverImage', x)} folder="services" />
                  <Select label="Icon" value={v.icon} onChange={(x) => set('icon', x)} options={Object.keys(SERVICE_ICONS).map((k) => ({ value: k, label: k }))} />
                  <Switch checked={v.isFeatured} onChange={(x) => set('isFeatured', x)} label="Featured service" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Button label" value={v.cta?.label || ''} onChange={(e) => set('cta.label', e.target.value)} />
                    <Input label="Button link" value={v.cta?.href || ''} onChange={(e) => set('cta.href', e.target.value)} />
                  </div>
                </div>
              </Card>
            </div>
          );
        if (tab === 'content')
          return (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Benefits">
                <StringListEditor items={v.benefits} onChange={(x) => set('benefits', x)} placeholder="Benefit" addLabel="Add benefit" />
              </Card>
              <Card title="Deliverables">
                <StringListEditor items={v.deliverables} onChange={(x) => set('deliverables', x)} placeholder="Deliverable" addLabel="Add deliverable" />
              </Card>
              <Card title="Production process" className="xl:col-span-2">
                <ListEditor
                  items={v.process}
                  onChange={(x) => set('process', x)}
                  max={12}
                  addLabel="Add step"
                  newItem={{ title: '', description: '' }}
                  renderRow={(row, update) => (
                    <div className="grid gap-3 md:grid-cols-[240px_1fr]">
                      <Input label="Step" value={row.title} onChange={(e) => update({ title: e.target.value })} />
                      <Input label="Description" value={row.description} onChange={(e) => update({ description: e.target.value })} />
                    </div>
                  )}
                />
              </Card>
            </div>
          );
        if (tab === 'pricing')
          return (
            <div className="space-y-6">
              <Card title="Starting price" description="Public prices are indicative estimates, not quotations.">
                <div className="grid gap-5 md:grid-cols-[1fr_120px_auto] md:items-end">
                  <Input label="Starting from" type="number" min={0} value={v.startingPrice?.amount ?? ''} onChange={(e) => set('startingPrice.amount', e.target.value === '' ? null : Number(e.target.value))} />
                  <Input label="Currency" value={v.startingPrice?.currency || 'NGN'} onChange={(e) => set('startingPrice.currency', e.target.value.toUpperCase().slice(0, 3))} />
                  <Switch checked={Boolean(v.startingPrice?.visible)} onChange={(x) => set('startingPrice.visible', x)} label="Show publicly" />
                </div>
                <Input className="mt-5" label="Price note" value={v.startingPrice?.note || ''} onChange={(e) => set('startingPrice.note', e.target.value)} maxLength={140} />
              </Card>
              <Card title="Packages">
                <ListEditor
                  items={v.packages}
                  onChange={(x) => set('packages', x)}
                  max={8}
                  addLabel="Add package"
                  newItem={{ name: '', description: '', price: null, currency: 'NGN', priceLabel: 'From', priceVisible: false, features: [], isFeatured: false }}
                  renderRow={(row, update) => (
                    <>
                      <div className="grid gap-3 md:grid-cols-[1fr_140px_120px]">
                        <Input label="Package name" value={row.name} onChange={(e) => update({ name: e.target.value })} />
                        <Input label="Price" type="number" min={0} value={row.price ?? ''} onChange={(e) => update({ price: e.target.value === '' ? null : Number(e.target.value) })} />
                        <Input label="Price label" value={row.priceLabel} onChange={(e) => update({ priceLabel: e.target.value })} placeholder="From" />
                      </div>
                      <Input label="Description" value={row.description} onChange={(e) => update({ description: e.target.value })} />
                      <CommaListInput label="Features (comma separated)" value={row.features || []} onChange={(x) => update({ features: x })} max={20} />
                      <div className="flex flex-wrap gap-6">
                        <Switch checked={row.priceVisible} onChange={(x) => update({ priceVisible: x })} label="Show price" />
                        <Switch checked={row.isFeatured} onChange={(x) => update({ isFeatured: x })} label="Highlight" />
                      </div>
                    </>
                  )}
                />
              </Card>
              <Card title="Add-ons">
                <ListEditor
                  items={v.addOns}
                  onChange={(x) => set('addOns', x)}
                  addLabel="Add add-on"
                  newItem={{ name: '', description: '', price: null, priceVisible: false }}
                  renderRow={(row, update) => (
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto] md:items-end">
                      <Input label="Name" value={row.name} onChange={(e) => update({ name: e.target.value })} />
                      <Input label="Description" value={row.description} onChange={(e) => update({ description: e.target.value })} />
                      <Input label="Price" type="number" min={0} value={row.price ?? ''} onChange={(e) => update({ price: e.target.value === '' ? null : Number(e.target.value) })} />
                      <Switch checked={row.priceVisible} onChange={(x) => update({ priceVisible: x })} label="Show" />
                    </div>
                  )}
                />
              </Card>
            </div>
          );
        if (tab === 'faq')
          return (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="FAQs">
                <ListEditor
                  items={v.faqs}
                  onChange={(x) => set('faqs', x)}
                  addLabel="Add question"
                  newItem={{ question: '', answer: '' }}
                  renderRow={(row, update) => (
                    <>
                      <Input label="Question" value={row.question} onChange={(e) => update({ question: e.target.value })} />
                      <Textarea label="Answer" rows={3} value={row.answer} onChange={(e) => update({ answer: e.target.value })} />
                    </>
                  )}
                />
              </Card>
              <Card title="Testimonials" description="Only publish testimonials the client has approved.">
                <ListEditor
                  items={v.testimonials}
                  onChange={(x) => set('testimonials', x)}
                  addLabel="Add testimonial"
                  newItem={{ quote: '', author: '', role: '', approved: false }}
                  renderRow={(row, update) => (
                    <>
                      <Textarea label="Quote" rows={3} value={row.quote} onChange={(e) => update({ quote: e.target.value })} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Author" value={row.author} onChange={(e) => update({ author: e.target.value })} />
                        <Input label="Role / company" value={row.role} onChange={(e) => update({ role: e.target.value })} />
                      </div>
                      <Switch checked={row.approved} onChange={(x) => update({ approved: x })} label="Approved for publication" />
                    </>
                  )}
                />
              </Card>
            </div>
          );
        if (tab === 'questions')
          return (
            <Card title="Enquiry questions" description="Extra questions visitors see in the enquiry form when they choose this service.">
              <ListEditor
                items={v.enquiryQuestions}
                onChange={(x) => set('enquiryQuestions', x)}
                max={15}
                addLabel="Add question"
                newItem={() => ({ key: `question_${Date.now().toString(36)}`, label: '', type: 'text', options: [], required: false, helpText: '' })}
                renderRow={(row, update) => (
                  <>
                    <div className="grid gap-3 md:grid-cols-[1fr_200px]">
                      <Input label="Question" value={row.label} onChange={(e) => update({ label: e.target.value })} />
                      <Select
                        label="Answer type"
                        value={row.type}
                        onChange={(x) => update({ type: x })}
                        options={[
                          { value: 'text', label: 'Short text' },
                          { value: 'textarea', label: 'Long text' },
                          { value: 'number', label: 'Number' },
                          { value: 'select', label: 'Single choice' },
                          { value: 'multiselect', label: 'Multiple choice' },
                          { value: 'date', label: 'Date' },
                          { value: 'boolean', label: 'Yes / No' },
                        ]}
                      />
                    </div>
                    {['select', 'multiselect'].includes(row.type) && (
                      <CommaListInput label="Choices (comma separated)" value={row.options || []} onChange={(x) => update({ options: x })} />
                    )}
                    <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
                      <Input label="Help text" value={row.helpText} onChange={(e) => update({ helpText: e.target.value })} />
                      <Input label="Field key" value={row.key} onChange={(e) => update({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} hint="Used in reports" />
                      <Switch checked={row.required} onChange={(x) => update({ required: x })} label="Required" />
                    </div>
                  </>
                )}
              />
            </Card>
          );
        return (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Portfolio examples">
              <Select label="Productions" multiple searchable value={v.portfolio} onChange={(x) => set('portfolio', x)} options={productionOptions} hint="Only published productions appear publicly." />
            </Card>
            <Card title="Search engines">
              <SeoFields value={v.seo} onChange={(x) => set('seo', x)} fallbackTitle={v.title} fallbackDescription={v.summary} />
            </Card>
          </div>
        );
      }}
    />
  );
}
