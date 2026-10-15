import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Badge, Card, PageHeader, Switch } from '../../../components/ui/Primitives';
import ImageCollectionManager from '../../../features/admin/ImageCollectionManager';
import { useOptions } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';

const CATEGORIES = [
  { value: 'production', label: 'Production' },
  { value: 'behind_the_scenes', label: 'Behind the scenes' },
  { value: 'film_set', label: 'Film set' },
  { value: 'studio', label: 'Studio activity' },
];

function TickerSettings() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', '/cms/ticker/settings'], queryFn: async () => (await api.get('/cms/ticker/settings')).data });
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => data && setS(data), [data]);
  if (!s) return null;
  const canPublish = can(P.CMS_PUBLISH);

  const save = async () => {
    setSaving(true);
    try {
      const { data: next } = await api.patch('/cms/ticker/settings', {
        enabled: s.enabled,
        speedSeconds: Number(s.speedSeconds),
        direction: s.direction,
        pauseOnHover: s.pauseOnHover,
        imageHeight: s.imageHeight,
      });
      setS(next);
      qc.invalidateQueries({ queryKey: ['public'] });
      toast.success('Ticker settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Ticker behaviour"
      description="Applies to the moving image strip on the homepage."
      actions={canPublish && <Button size="sm" icon={Save} loading={saving} onClick={save}>Save</Button>}
    >
      <fieldset disabled={!canPublish} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Switch checked={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} label="Show ticker" description="Turn the whole strip on or off" />
        <Switch checked={s.pauseOnHover} onChange={(v) => setS({ ...s, pauseOnHover: v })} label="Pause on hover" description="Always pauses on keyboard focus" />
        <Input label={`Loop speed: ${s.speedSeconds}s`} type="range" min={10} max={180} step={5} value={s.speedSeconds} onChange={(e) => setS({ ...s, speedSeconds: Number(e.target.value) })} hint="Time for one full loop — higher is slower." inputClassName="!h-11 accent-[rgb(var(--app-accent))] px-0 border-0 bg-transparent focus:ring-0" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Direction" value={s.direction} onChange={(v) => setS({ ...s, direction: v })} options={[{ value: 'left', label: '← Left' }, { value: 'right', label: 'Right →' }]} />
          <Select label="Height" value={s.imageHeight} onChange={(v) => setS({ ...s, imageHeight: v })} options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]} />
        </div>
      </fieldset>
    </Card>
  );
}

/** Manage the continuous moving image ticker: images, order, visibility, links and speed. */
export default function TickerAdminPage() {
  const productionOptions = useOptions('/cms/productions');
  return (
    <>
      <PageHeader eyebrow="Website" title="Moving image ticker" description="A continuous strip of production stills, sets and behind-the-scenes moments. Visitors with reduced-motion settings see a static, swipeable row." />
      <div className="mb-8">
        <TickerSettings />
      </div>
      <ImageCollectionManager
        resource="/cms/ticker/items"
        folder="ticker"
        defaults={{ category: 'production', link: { type: 'none' } }}
        aspect="aspect-[4/3]"
        badge={(item) => item.link?.type && item.link.type !== 'none' && <Badge tone="info"><Link2 className="h-3 w-3" /> Linked</Badge>}
        renderFields={(d, set) => (
          <>
            <Select label="Category" value={d.category || 'production'} onChange={(v) => set((x) => ({ ...x, category: v }))} options={CATEGORIES} />
            <Select
              label="When clicked"
              value={d.link?.type || 'none'}
              onChange={(v) => set((x) => ({ ...x, link: { ...(x.link || {}), type: v } }))}
              options={[
                { value: 'none', label: 'Nothing (image only)' },
                { value: 'production', label: 'Open a production page' },
                { value: 'gallery', label: 'Open the studio gallery' },
                { value: 'url', label: 'Open a custom link' },
              ]}
            />
            {d.link?.type === 'production' && (
              <Select
                label="Production"
                searchable
                value={typeof d.link.production === 'object' ? d.link.production?._id : d.link.production}
                onChange={(v) => set((x) => ({ ...x, link: { ...x.link, production: v } }))}
                options={productionOptions}
                hint="Only published productions are linked on the live site."
              />
            )}
            {d.link?.type === 'url' && <Input label="Link" value={d.link.url || ''} onChange={(e) => set((x) => ({ ...x, link: { ...x.link, url: e.target.value } }))} placeholder="/news/… or https://…" />}
          </>
        )}
      />
    </>
  );
}
