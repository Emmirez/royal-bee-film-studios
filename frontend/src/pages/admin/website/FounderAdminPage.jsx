import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Images, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { Card, ErrorState, PageHeader, PageLoader, Switch, Tabs } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { ListEditor, StringListEditor } from '../../../components/admin/ListEditor';
import { SingletonWorkflowBar } from '../../../components/admin/WorkflowBar';
import SeoFields from '../../../features/admin/SeoFields';
import { useOptions } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useFormState } from '../../../hooks/useFormState';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';

const KEY = ['admin', '/cms/founder'];
const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'story', label: 'Biography & vision' },
  { value: 'experience', label: 'Experience' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'media', label: 'Media & links' },
  { value: 'seo', label: 'Related & SEO' },
];

const toIds = (list) => (list || []).map((x) => (typeof x === 'object' ? x._id : x));

/** Founder profile editor (homepage spotlight + full About → Founder page). */
export default function FounderAdminPage() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('profile');
  const { data: doc, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/cms/founder')).data });
  const form = useFormState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const productionOptions = useOptions('/cms/productions');
  const canEdit = can(P.CMS_EDIT);

  useEffect(() => {
    if (doc && !form.dirty) form.reset({ ...doc.draft, relatedProductions: toIds(doc.draft?.relatedProductions) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (isLoading || !form.value) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const v = form.value;
  const t = (path, max, props = {}) => ({ value: v[path] || '', onChange: (e) => form.set(path, e.target.value), maxLength: max, ...props });

  const applyDoc = (data) => {
    qc.setQueryData(KEY, data);
    form.reset({ ...data.draft, relatedProductions: toIds(data.draft?.relatedProductions) });
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v };
      body.mediaAppearances = (body.mediaAppearances || []).map((m) => ({ ...m, date: m.date || null }));
      const { data } = await api.patch('/cms/founder', body);
      applyDoc(data);
      toast.success('Draft saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const action = async (name, body) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/cms/founder/${name}`, body);
      applyDoc(data);
      qc.invalidateQueries({ queryKey: ['public'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Founder profile"
        description="Powers the homepage founder spotlight and the About → Founder page."
        actions={
          <>
            <Button to="/admin/website/founder-gallery" variant="secondary" icon={Images}>
              Gallery
            </Button>
            <Button href="/about/founder" variant="ghost" icon={ExternalLink}>
              View live
            </Button>
            {canEdit && (
              <Button icon={Save} loading={saving} disabled={!form.dirty} onClick={save}>
                Save draft
              </Button>
            )}
          </>
        }
      />
      <SingletonWorkflowBar doc={doc} onAction={action} dirty={form.dirty} busy={busy} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="my-6 w-fit max-w-full" />

      <fieldset disabled={!canEdit}>
        {tab === 'profile' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Identity">
              <div className="space-y-5">
                <Input label="Full name" {...t('name', 120)} />
                <Input label="Title" {...t('title', 120)} placeholder="Founder & Creative Director" />
                <ImageField label="Professional portrait" value={v.portrait} onChange={(x) => form.set('portrait', x)} folder="founder" aspect="4/5" />
                <ImageField label="Founder page banner" value={v.coverImage} onChange={(x) => form.set('coverImage', x)} folder="founder" />
                <Switch checked={Boolean(v.isPlaceholder)} onChange={(x) => form.set('isPlaceholder', x)} label="Placeholder content" description="Turn off once real details are in place." />
              </div>
            </Card>
            <Card title="Homepage spotlight">
              <div className="space-y-5">
                <Input label="Eyebrow" {...t('spotlightEyebrow', 60)} />
                <Input label="Heading" {...t('spotlightHeading', 160)} />
                <Textarea label="Short introduction" rows={4} {...t('shortBio', 700)} />
                <Textarea label="Quote" rows={3} {...t('quote', 400)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Button label" value={v.cta?.label || ''} onChange={(e) => form.set('cta.label', e.target.value)} />
                  <Input label="Button link" value={v.cta?.href || ''} onChange={(e) => form.set('cta.href', e.target.value)} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'story' && (
          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card title="Biography" description="One block per paragraph.">
              <StringListEditor items={v.biography || []} onChange={(x) => form.set('biography', x)} multiline placeholder="Paragraph" addLabel="Add paragraph" max={20} />
            </Card>
            <Card title="Vision & philosophy">
              <div className="space-y-5">
                <Textarea label="Vision" rows={6} {...t('vision', 2000)} />
                <Textarea label="Creative philosophy" rows={6} {...t('philosophy', 2000)} />
              </div>
            </Card>
          </div>
        )}

        {tab === 'experience' && (
          <Card title="Experience" description="Shown as a timeline on the founder page.">
            <ListEditor
              items={v.experience || []}
              onChange={(x) => form.set('experience', x)}
              addLabel="Add role"
              newItem={{ role: '', organization: '', period: '', description: '' }}
              renderRow={(row, update) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Role" value={row.role} onChange={(e) => update({ role: e.target.value })} />
                    <Input label="Organization" value={row.organization} onChange={(e) => update({ organization: e.target.value })} />
                    <Input label="Period" value={row.period} onChange={(e) => update({ period: e.target.value })} placeholder="2018 – present" />
                  </div>
                  <Textarea label="Description" rows={2} value={row.description} onChange={(e) => update({ description: e.target.value })} maxLength={800} />
                </>
              )}
            />
          </Card>
        )}

        {tab === 'achievements' && (
          <Card title="Achievements" description="Only achievements marked “verified” are shown on the website. Don’t add credentials or awards you can’t evidence.">
            <ListEditor
              items={v.achievements || []}
              onChange={(x) => form.set('achievements', x)}
              addLabel="Add achievement"
              newItem={{ title: '', year: '', description: '', verified: false, evidenceUrl: '' }}
              renderRow={(row, update) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <Input label="Title" value={row.title} onChange={(e) => update({ title: e.target.value })} />
                    <Input label="Year" value={row.year} onChange={(e) => update({ year: e.target.value })} maxLength={10} />
                  </div>
                  <Textarea label="Description" rows={2} value={row.description} onChange={(e) => update({ description: e.target.value })} maxLength={600} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Input label="Evidence link (internal only)" value={row.evidenceUrl} onChange={(e) => update({ evidenceUrl: e.target.value })} hint="Never shown publicly." />
                    <Switch checked={row.verified} onChange={(x) => update({ verified: x })} label="Verified" />
                  </div>
                </>
              )}
            />
          </Card>
        )}

        {tab === 'media' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Media appearances, interviews & publications">
              <ListEditor
                items={v.mediaAppearances || []}
                onChange={(x) => form.set('mediaAppearances', x)}
                addLabel="Add appearance"
                newItem={{ title: '', outlet: '', type: 'interview', date: null, url: '' }}
                renderRow={(row, update) => (
                  <>
                    <Input label="Title" value={row.title} onChange={(e) => update({ title: e.target.value })} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Outlet" value={row.outlet} onChange={(e) => update({ outlet: e.target.value })} />
                      <Select
                        label="Type"
                        value={row.type}
                        onChange={(x) => update({ type: x })}
                        options={['interview', 'article', 'podcast', 'tv', 'panel', 'publication', 'other'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))}
                      />
                      <Input label="Date" type="date" value={row.date ? String(row.date).slice(0, 10) : ''} onChange={(e) => update({ date: e.target.value || null })} />
                    </div>
                    <Input label="Link" value={row.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" />
                  </>
                )}
              />
            </Card>
            <Card title="Professional links">
              <ListEditor
                items={v.links || []}
                onChange={(x) => form.set('links', x)}
                addLabel="Add link"
                max={15}
                newItem={{ label: '', url: '', platform: 'website' }}
                renderRow={(row, update) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Label" value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="IMDb" />
                    <Input label="URL" value={row.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" />
                  </div>
                )}
              />
            </Card>
          </div>
        )}

        {tab === 'seo' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Related productions">
              <Select label="Productions" multiple searchable value={v.relatedProductions || []} onChange={(x) => form.set('relatedProductions', x)} options={productionOptions} hint="Only published productions appear on the website." />
            </Card>
            <Card title="Search engines">
              <SeoFields value={v.seo || {}} onChange={(x) => form.set('seo', x)} />
            </Card>
          </div>
        )}
      </fieldset>
    </>
  );
}
