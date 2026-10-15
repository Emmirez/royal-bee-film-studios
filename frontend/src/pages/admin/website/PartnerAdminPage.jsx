import { useEffect, useState } from 'react';
import { ExternalLink, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import { Card, ErrorState, PageHeader, PageLoader } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { ListEditor } from '../../../components/admin/ListEditor';
import { SingletonWorkflowBar } from '../../../components/admin/WorkflowBar';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useFormState } from '../../../hooks/useFormState';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';

const KEY = ['admin', '/cms/partner'];

/** Turn a title into a stable key, e.g. "Brand partnerships" → "brand_partnerships". */
const toKey = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `type_${Date.now()}`;

/** "Partner with us" page editor — edits a draft; the live page changes on publish. */
export default function PartnerAdminPage() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: doc, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/cms/partner')).data });
  const form = useFormState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const canEdit = can(P.CMS_EDIT);

  useEffect(() => {
    if (doc && !form.dirty) form.reset(doc.draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (isLoading || !form.value) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const v = form.value;

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const types = (v.types || []).filter((t) => t.title?.trim()).map((t) => ({ ...t, key: t.key || toKey(t.title) }));
      const { data } = await api.patch('/cms/partner', { ...v, types });
      qc.setQueryData(KEY, data);
      form.reset(data.draft);
      toast.success('Draft saved — publish to update the live page');
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const action = async (name, body) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/cms/partner/${name}`, body);
      qc.setQueryData(KEY, data);
      form.reset(data.draft);
      qc.invalidateQueries({ queryKey: ['public'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Partner page"
        description="The “Partner with us” page. Proposals sent from it appear in Enquiries, marked Partnership."
        actions={
          <>
            <Button variant="secondary" icon={ExternalLink} href="/partner" target="_blank">
              View live page
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

      <fieldset disabled={!canEdit} className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Top of the page">
            <div className="space-y-5">
              <Input label="Eyebrow" value={v.eyebrow || ''} onChange={(e) => form.set('eyebrow', e.target.value)} maxLength={60} />
              <Textarea label="Heading" rows={2} value={v.heading || ''} onChange={(e) => form.set('heading', e.target.value)} maxLength={160} error={errors.heading} />
              <Textarea label="Intro" rows={4} value={v.intro || ''} onChange={(e) => form.set('intro', e.target.value)} maxLength={600} />
              <ImageField label="Photo" value={v.image} onChange={(x) => form.set('image', x)} folder="general" aspect="4/3" />
            </div>
          </Card>

          <Card title="Ways to partner" description="Each one becomes a card on the page and an option in the form.">
            <div className="space-y-4">
              <Input label="Section heading" value={v.typesHeading || ''} onChange={(e) => form.set('typesHeading', e.target.value)} maxLength={80} />
              <ListEditor
                items={v.types || []}
                onChange={(x) => form.set('types', x)}
                max={10}
                addLabel="Add partnership type"
                newItem={() => ({ key: '', title: '', description: '' })}
                renderRow={(row, update) => (
                  <>
                    <Input label="Title" value={row.title} onChange={(e) => update({ title: e.target.value })} maxLength={80} />
                    <Textarea label="Description" rows={2} value={row.description || ''} onChange={(e) => update({ description: e.target.value })} maxLength={400} />
                  </>
                )}
              />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="How it works" description="Short steps shown under the cards.">
            <div className="space-y-4">
              <Input label="Section heading" value={v.stepsHeading || ''} onChange={(e) => form.set('stepsHeading', e.target.value)} maxLength={80} />
              <ListEditor
                items={v.steps || []}
                onChange={(x) => form.set('steps', x)}
                max={6}
                addLabel="Add step"
                newItem={{ title: '', description: '' }}
                renderRow={(row, update) => (
                  <>
                    <Input label="Title" value={row.title} onChange={(e) => update({ title: e.target.value })} maxLength={80} />
                    <Textarea label="Description" rows={2} value={row.description || ''} onChange={(e) => update({ description: e.target.value })} maxLength={300} />
                  </>
                )}
              />
            </div>
          </Card>

          <Card title="Form">
            <div className="space-y-5">
              <Input label="Form heading" value={v.formHeading || ''} onChange={(e) => form.set('formHeading', e.target.value)} maxLength={120} />
              <Textarea label="Form intro" rows={2} value={v.formIntro || ''} onChange={(e) => form.set('formIntro', e.target.value)} maxLength={300} />
              <Textarea label="Thank-you message" rows={2} value={v.successMessage || ''} onChange={(e) => form.set('successMessage', e.target.value)} maxLength={300} hint="Shown after someone sends a proposal." />
            </div>
          </Card>
        </div>
      </fieldset>
    </>
  );
}