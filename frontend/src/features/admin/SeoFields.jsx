import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { Switch } from '../../components/ui/Primitives';
import ImageField from '../../components/admin/ImageField';

/** SEO metadata + indexing control, with a search-result preview. */
export default function SeoFields({ value = {}, onChange, fallbackTitle = '', fallbackDescription = '' }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const title = value.title || fallbackTitle || 'Page title';
  const description = value.description || fallbackDescription || 'Page description appears here.';
  return (
    <div className="space-y-5">
      <Input label="SEO title" value={value.title || ''} onChange={(e) => set('title', e.target.value)} maxLength={70} hint={`${(value.title || '').length}/70 — leave empty to use the page title.`} />
      <Textarea label="Meta description" rows={3} value={value.description || ''} onChange={(e) => set('description', e.target.value)} maxLength={170} />
      <div className="rounded-xl border border-app-border bg-app-raised p-4" aria-label="Search result preview">
        <p className="truncate text-[15px] font-medium text-status-info">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-app-subtle">{description}</p>
      </div>
      <ImageField label="Social share image (optional)" value={value.ogImage} onChange={(img) => set('ogImage', img)} folder="general" withAlt={false} />
      <Switch checked={Boolean(value.noIndex)} onChange={(v) => set('noIndex', v)} label="Hide from search engines" description="Adds noindex to this page." />
    </div>
  );
}
