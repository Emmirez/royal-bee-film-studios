import { useEffect, useState } from 'react';
import { Eye, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { Card, ErrorState, PageHeader, PageLoader, Switch } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import VideoField from '../../../components/admin/VideoField';
import { ListEditor } from '../../../components/admin/ListEditor';
import { SingletonWorkflowBar } from '../../../components/admin/WorkflowBar';
import HeroSection from '../../../features/public/home/sections/HeroSection';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useFormState } from '../../../hooks/useFormState';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';

const KEY = ['admin', '/cms/hero'];

/** Hero video editor — edits a draft; the live hero only changes on publish. */
export default function HeroAdminPage() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: doc, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/cms/hero')).data });
  const form = useFormState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
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
      const { data } = await api.patch('/cms/hero', v);
      qc.setQueryData(KEY, data);
      form.reset(data.draft);
      toast.success('Draft saved');
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
      const { data } = await api.post(`/cms/hero/${name}`, body);
      qc.setQueryData(KEY, data);
      form.reset(data.draft);
      qc.invalidateQueries({ queryKey: ['public'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Hero video"
        description="The full-screen video at the top of the homepage. Changes stay in draft until published."
        actions={
          <>
            <Button variant="secondary" icon={Eye} onClick={() => setPreview(true)}>
              Preview draft
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
        <div className="space-y-6">
          <Card title="Text">
            <div className="space-y-5">
              <Input label="Eyebrow" value={v.eyebrow || ''} onChange={(e) => form.set('eyebrow', e.target.value)} maxLength={80} hint="Small line above the headline." />
              <Textarea label="Headline" rows={2} value={v.headline || ''} onChange={(e) => form.set('headline', e.target.value)} maxLength={140} error={errors.headline} />
              <Textarea label="Supporting text" rows={3} value={v.subheadline || ''} onChange={(e) => form.set('subheadline', e.target.value)} maxLength={320} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Select
                  label="Text alignment"
                  value={v.textAlign || 'left'}
                  onChange={(x) => form.set('textAlign', x)}
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Centered' },
                  ]}
                />
                <Input label={`Darkening overlay: ${v.overlayOpacity ?? 45}%`} type="range" min={0} max={90} step={5} value={v.overlayOpacity ?? 45} onChange={(e) => form.set('overlayOpacity', Number(e.target.value))} inputClassName="!h-11 accent-[rgb(var(--app-accent))] px-0 border-0 bg-transparent focus:ring-0" />
              </div>
              <Switch checked={v.showScrollCue !== false} onChange={(x) => form.set('showScrollCue', x)} label="Show “Scroll” cue" />
            </div>
          </Card>

          <Card title="Buttons" description="Up to three calls to action.">
            <ListEditor
              items={v.ctas || []}
              onChange={(x) => form.set('ctas', x)}
              max={3}
              addLabel="Add button"
              newItem={{ label: '', href: '/', variant: 'primary' }}
              renderRow={(row, update) => (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
                  <Input label="Label" value={row.label} onChange={(e) => update({ label: e.target.value })} />
                  <Input label="Link" value={row.href} onChange={(e) => update({ href: e.target.value })} placeholder="/enquire" />
                  <Select
                    label="Style"
                    value={row.variant}
                    onChange={(x) => update({ variant: x })}
                    options={[
                      { value: 'primary', label: 'Gold' },
                      { value: 'secondary', label: 'Outline' },
                    ]}
                  />
                </div>
              )}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Video" description="Muted, looping background video. Visitors can pause it.">
            <VideoField value={v.video} onChange={(x) => form.set('video', x)} folder="hero" showMobile />
          </Card>
          <Card title="Poster & mobile">
            <div className="space-y-5">
              <ImageField label="Poster / fallback image" value={v.posterImage} onChange={(x) => form.set('posterImage', x)} folder="hero" hint="Shown while the video loads, if it fails, and for reduced-motion visitors." />
              <Select
                label="On phones"
                value={v.mobileBehavior || 'full_video'}
                onChange={(x) => form.set('mobileBehavior', x)}
                options={[
                  { value: 'full_video', label: 'Play the full video' },
                  { value: 'mobile_video', label: 'Play the lighter mobile video', description: 'Set a mobile video path above' },
                  { value: 'poster', label: 'Show the poster only', description: 'Saves mobile data' },
                ]}
              />
            </div>
          </Card>
        </div>
      </fieldset>

      <Modal open={preview} onClose={() => setPreview(false)} title="Draft preview" size="full" className="!bg-ink-950">
        <div className="-mx-5 -my-5 overflow-hidden sm:-mx-6 [&>section]:!h-[70vh] [&>section]:!min-h-[480px]">
          <HeroSection data={v} />
        </div>
      </Modal>
    </>
  );
}
