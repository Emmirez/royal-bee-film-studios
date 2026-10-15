import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import ImageField from '../../components/admin/ImageField';
import MultiImageField from '../../components/admin/MultiImageField';
import { ListEditor, StringListEditor } from '../../components/admin/ListEditor';
import { Switch } from '../../components/ui/Primitives';
import { useOptions } from './adminApi';

export const SECTION_TYPES = [
  { value: 'hero', label: 'Hero video', description: 'Edited on the Hero video page' },
  { value: 'intro', label: 'Studio introduction' },
  { value: 'ticker', label: 'Moving image ticker', description: 'Images managed on the Ticker page' },
  { value: 'featured_productions', label: 'Featured productions' },
  { value: 'services', label: 'Services' },
  { value: 'founder', label: 'Founder spotlight', description: 'Content from the Founder profile' },
  { value: 'news', label: 'Latest news' },
  { value: 'gallery', label: 'Image gallery', description: 'Up to 6 photos after the news section' },
  { value: 'partner', label: 'Partner with us banner', description: 'A banner with a button to the Partner page' },
  { value: 'talent', label: 'Join our talent roster banner', description: 'A dark strip with a button to the talent application page' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'cta', label: 'Call-to-action banner' },
  { value: 'contact', label: 'Contact details' },
];

const Heading = ({ c, set }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <Input label="Eyebrow" value={c.eyebrow || ''} onChange={(e) => set({ eyebrow: e.target.value })} maxLength={60} />
    <Input label="Heading" value={c.heading || ''} onChange={(e) => set({ heading: e.target.value })} maxLength={160} />
  </div>
);

const LinkNote = ({ to, children }) => (
  <p className="rounded-xl bg-app-muted px-4 py-3 text-sm text-app-subtle">
    {children}{' '}
    <Link to={to} className="font-semibold text-app-text underline underline-offset-4">
      Open editor
    </Link>
  </p>
);

/** Per-type content form for a homepage section. `content` is the section's content object. */
export function SectionContentForm({ type, content = {}, onChange }) {
  const c = content;
  const set = (patch) => onChange({ ...c, ...patch });
  const productionOptions = useOptions('/cms/productions');
  const serviceOptions = useOptions('/cms/services');

  switch (type) {
    case 'hero':
      return <LinkNote to="/admin/website/hero">The hero video, text and buttons are edited on their own page.</LinkNote>;
    case 'founder':
      return <LinkNote to="/admin/website/founder">The spotlight uses the published founder profile and featured founder photos.</LinkNote>;
    case 'ticker':
      return (
        <div className="space-y-5">
          <Select
            label="Style"
            value={c.style || 'showcase'}
            onChange={(style) => set({ style })}
            options={[
              { value: 'showcase', label: 'Showcase', description: 'Tall staggered portrait cards + moving text ribbon — best right after the hero' },
              { value: 'strip', label: 'Strip', description: 'Rounded card with a heading and a mixed-size image strip' },
            ]}
          />
          {(c.style || 'showcase') === 'showcase' ? (
            <>
              <Switch checked={c.showText !== false} onChange={(v) => set({ showText: v })} label="Show moving text ribbon" description="Large words with gold stars under the images" />
              {c.showText !== false && (
                <>
                  <div>
                    <p className="field-label">Ribbon words</p>
                    <StringListEditor items={c.marqueeText || []} onChange={(marqueeText) => set({ marqueeText })} placeholder="e.g. Feature Films" addLabel="Add word or phrase" max={20} />
                    <p className="field-hint">Leave empty to use: Feature Films, Commercials, Documentaries, Music Videos, Post-Production, Royal Bee Film Studios.</p>
                  </div>
                  <Input
                    label={`Ribbon speed: ${c.textSpeedSeconds || 40}s per loop`}
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={c.textSpeedSeconds || 40}
                    onChange={(e) => set({ textSpeedSeconds: Number(e.target.value) })}
                    hint="Higher is slower."
                    inputClassName="!h-11 accent-[rgb(var(--app-accent))] px-0 border-0 bg-transparent focus:ring-0"
                  />
                </>
              )}
              <Input label="Accessible label" value={c.heading || ''} onChange={(e) => set({ heading: e.target.value })} hint="Not shown on screen in this style — read out by screen readers." />
            </>
          ) : (
            <Heading c={c} set={set} />
          )}
          <LinkNote to="/admin/website/ticker">Images, order, visibility, links, speed, direction and height are managed on the Image ticker page.</LinkNote>
        </div>
      );
    case 'intro':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Textarea label="Body" rows={4} value={c.body || ''} onChange={(e) => set({ body: e.target.value })} maxLength={1200} />
          <ImageField label="Image" value={c.image} onChange={(img) => set({ image: img })} folder="general" aspect="4/5" />
          <Switch
            label="Show wide image below the text"
            description="A large landscape photo across the full width of the section."
            checked={c.showWideImage !== false}
            onChange={(v) => set({ showWideImage: v })}
          />
          {c.showWideImage !== false && (
            <>
              <ImageField label="Wide image (landscape)" value={c.wideImage} onChange={(img) => set({ wideImage: img })} folder="general" aspect="21/9" />
              <Input label="Wide image caption (optional)" value={c.wideImageCaption || ''} onChange={(e) => set({ wideImageCaption: e.target.value })} maxLength={160} />
            </>
          )}
          <div>
            <p className="field-label">Key facts</p>
            <ListEditor
              items={c.stats || []}
              onChange={(stats) => set({ stats })}
              max={6}
              addLabel="Add fact"
              newItem={{ value: '', label: '' }}
              renderRow={(row, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Value" value={row.value} onChange={(e) => update({ value: e.target.value })} placeholder="12+" />
                  <Input label="Label" value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="Years of production" />
                </div>
              )}
            />
            <p className="field-hint">Only include facts you can stand behind.</p>
          </div>
        </div>
      );
    case 'featured_productions':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Select label="Productions to feature (in order)" multiple searchable value={c.productionIds || []} onChange={(productionIds) => set({ productionIds })} options={productionOptions} hint="Leave empty to show productions marked “featured”. Only published, public productions appear." />
          <Input label="Maximum to show" type="number" min={1} max={12} value={c.limit || 6} onChange={(e) => set({ limit: Number(e.target.value) || 6 })} className="max-w-[160px]" />
        </div>
      );
    case 'services':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Textarea label="Intro" rows={2} value={c.intro || ''} onChange={(e) => set({ intro: e.target.value })} maxLength={300} />
          <Select label="Services to show" multiple searchable value={c.serviceIds || []} onChange={(serviceIds) => set({ serviceIds })} options={serviceOptions} hint="Leave empty to show all published services." />
        </div>
      );
    case 'news':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Input label="Number of articles" type="number" min={1} max={6} value={c.limit || 3} onChange={(e) => set({ limit: Number(e.target.value) || 3 })} className="max-w-[160px]" />
        </div>
      );
    case 'gallery':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Textarea label="Intro (optional)" rows={2} value={c.intro || ''} onChange={(e) => set({ intro: e.target.value })} maxLength={300} />
          <MultiImageField
            label="Photos"
            value={c.images || []}
            onChange={(images) => set({ images })}
            max={6}
            folder="gallery"
            hint="Click “Add photos” and pick one or several at once. Use the arrows to reorder. If you add none, the section shows photos from the Studio gallery."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="If no photos are added above, use Studio gallery photos from"
              value={c.category || 'all'}
              onChange={(category) => set({ category })}
              options={[
                { value: 'all', label: 'All categories' },
                { value: 'studio', label: 'Studio' },
                { value: 'production', label: 'Production' },
                { value: 'behind_the_scenes', label: 'Behind the scenes' },
                { value: 'on_set', label: 'On set' },
                { value: 'crew', label: 'Crew' },
              ]}
            />
                     </div>
          <Switch
            label="Show button"
            description="The button next to the heading."
            checked={c.showButton !== false}
            onChange={(v) => set({ showButton: v })}
          />
          {c.showButton !== false && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Button label" value={c.buttonLabel || ''} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="View full gallery" maxLength={40} />
              <Input label="Button link" value={c.buttonLink || ''} onChange={(e) => set({ buttonLink: e.target.value })} placeholder="/gallery" hint="Any page on the site, e.g. /gallery, /productions or /contact." />
            </div>
          )}
        </div>
      );
         case 'partner':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Textarea label="Text" rows={3} value={c.body || ''} onChange={(e) => set({ body: e.target.value })} maxLength={400} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Button label" value={c.buttonLabel || ''} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="Partner with us" maxLength={40} />
            <Input label="Button link" value={c.buttonLink || ''} onChange={(e) => set({ buttonLink: e.target.value })} placeholder="/partner" />
          </div>
          <ImageField label="Photo (optional)" value={c.image} onChange={(img) => set({ image: img })} folder="general" aspect="4/3" />
          <LinkNote to="/admin/website/partner">The Partner page itself (cards, steps and form) is edited on its own page.</LinkNote>
        </div>
      );
    case 'talent':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <Textarea label="Text" rows={3} value={c.body || ''} onChange={(e) => set({ body: e.target.value })} maxLength={400} placeholder="Apply once, and when you’re approved you get your own portal…" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Button label" value={c.buttonLabel || ''} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="Join the roster" maxLength={40} />
            <Input label="Button link" value={c.buttonLink || ''} onChange={(e) => set({ buttonLink: e.target.value })} placeholder="/join-talent" />
          </div>
          <Switch checked={c.showPerks !== false} onChange={(v) => set({ showPerks: v })} label="Show the three benefits" description="Casting calls, online bookings and a private profile — shown under the text." />
          <MultiImageField
            label="Photos (up to 3)"
            value={c.images?.length ? c.images : c.image?.url ? [{ image: c.image, caption: '' }] : []}
            onChange={(images) => set({ images, image: null })}
            max={3}
            folder="general"
            hint="Portrait photos of talent on set work best. 1 photo shows large, 2 are staggered, 3 make a collage. Leave empty for a text-only strip."
          />
          <LinkNote to="/admin/talent">Applications arrive in Talent → Talent roster → Applications.</LinkNote>
        </div>
      ); 
    case 'testimonials':
      return (
        <div className="space-y-4">
          <Heading c={c} set={set} />
          <ListEditor
            items={c.items || []}
            onChange={(items) => set({ items })}
            max={12}
            addLabel="Add testimonial"
            newItem={{ quote: '', author: '', role: '', approved: false }}
            renderRow={(row, update) => (
              <>
                <Textarea label="Quote" rows={3} value={row.quote} onChange={(e) => update({ quote: e.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Author" value={row.author} onChange={(e) => update({ author: e.target.value })} />
                  <Input label="Role / company" value={row.role} onChange={(e) => update({ role: e.target.value })} />
                </div>
                <Switch checked={row.approved} onChange={(x) => update({ approved: x })} label="Approved for publication" description="Unapproved testimonials are never shown." />
              </>
            )}
          />
        </div>
      );
    case 'cta':
      return (
        <div className="space-y-4">
          <Input label="Heading" value={c.heading || ''} onChange={(e) => set({ heading: e.target.value })} maxLength={160} />
          <Textarea label="Body" rows={3} value={c.body || ''} onChange={(e) => set({ body: e.target.value })} maxLength={400} />
          <ImageField label="Background image" value={c.backgroundImage} onChange={(img) => set({ backgroundImage: img })} folder="general" />
          <ListEditor
            items={c.ctas || []}
            onChange={(ctas) => set({ ctas })}
            max={3}
            addLabel="Add button"
            newItem={{ label: '', href: '/', variant: 'primary' }}
            renderRow={(row, update) => (
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
                <Input label="Label" value={row.label} onChange={(e) => update({ label: e.target.value })} />
                <Input label="Link" value={row.href} onChange={(e) => update({ href: e.target.value })} />
                <Select label="Style" value={row.variant} onChange={(x) => update({ variant: x })} options={[{ value: 'primary', label: 'Gold' }, { value: 'secondary', label: 'Outline' }]} />
              </div>
            )}
          />
        </div>
      );
    case 'contact':
      return (
        <div className="space-y-4">
          <Input label="Heading" value={c.heading || ''} onChange={(e) => set({ heading: e.target.value })} />
          <Textarea label="Body" rows={2} value={c.body || ''} onChange={(e) => set({ body: e.target.value })} />
          <LinkNote to="/admin/settings">Address, phone and email come from Studio settings.</LinkNote>
        </div>
      );
    default:
      return null;
  }
}