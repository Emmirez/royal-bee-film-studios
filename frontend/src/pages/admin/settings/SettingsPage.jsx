import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, ShieldAlert } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import CommaListInput from '../../../components/ui/CommaListInput';
import { Card, ErrorState, PageHeader, PageLoader, Switch, Tabs } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { StringListEditor } from '../../../components/admin/ListEditor';
import SeoFields from '../../../features/admin/SeoFields';
import { useAdminItem } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { useFormState } from '../../../hooks/useFormState';
import { api } from '../../../lib/api';

const TABS = [
  { value: 'studio', label: 'Studio' },
  { value: 'contact', label: 'Contact & social' },
  { value: 'enquiries', label: 'Enquiries & notifications' },
  { value: 'seo', label: 'SEO & search' },
  { value: 'workflow', label: 'Publishing workflow' },
];

const SOCIAL = ['instagram', 'youtube', 'facebook', 'x', 'linkedin', 'tiktok', 'vimeo'];

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [tab, setTab] = useState('studio');
  const { data, isLoading, error, refetch } = useAdminItem('/cms/settings', null);
  const form = useFormState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !form.dirty) form.reset(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading || !form.value) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const v = form.value;

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        studioName: v.studioName,
        tagline: v.tagline,
        logo: v.logo,
        contact: v.contact,
        social: v.social,
        seo: v.seo,
        footer: v.footer,
        search: v.search,
        notifications: v.notifications,
        enquiry: { ...v.enquiry, budgetRanges: v.enquiry.budgetRanges.filter(Boolean) },
        analytics: v.analytics,
      };
      const { data: next } = await api.patch('/cms/settings', body);
      form.reset(next);
      qc.setQueryData(['admin', '/cms/settings', 'item', null], next);
      qc.invalidateQueries({ queryKey: ['public'] });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleApproval = async (required) => {
    const ok = await confirm({
      title: required ? 'Require approval before publishing?' : 'Allow publishing without approval?',
      message: required ? 'All content will need an approver before it can go live.' : 'Publishers will be able to put content live without a second person reviewing it. This change is recorded in the audit trail.',
      tone: required ? 'default' : 'danger',
      confirmLabel: 'Change setting',
    });
    if (!ok) return;
    try {
      const { data: wf } = await api.patch('/cms/settings/workflow', { contentApprovalRequired: required });
      form.reset({ ...v, workflow: wf });
      qc.invalidateQueries({ queryKey: ['admin', '/cms/settings'] });
      toast.success('Workflow updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Studio settings" actions={tab !== 'workflow' && <Button icon={Save} loading={saving} disabled={!form.dirty} onClick={save}>Save settings</Button>} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6 w-fit max-w-full" />

      {tab === 'studio' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Identity">
            <div className="space-y-5">
              <Input label="Studio name" value={v.studioName} onChange={(e) => form.set('studioName', e.target.value)} />
              <Input label="Tagline" value={v.tagline} onChange={(e) => form.set('tagline', e.target.value)} maxLength={160} />
              <ImageField label="Logo" value={v.logo} onChange={(x) => form.set('logo', x)} folder="general" aspect="3/1" hint="Default: /logo.png from the website’s public folder." />
            </div>
          </Card>
          <Card title="Footer">
            <div className="space-y-5">
              <Textarea label="Footer text" rows={3} value={v.footer?.blurb || ''} onChange={(e) => form.set('footer.blurb', e.target.value)} maxLength={400} />
              <Input label="Copyright line" value={v.footer?.copyright || ''} onChange={(e) => form.set('footer.copyright', e.target.value)} hint="Type {year} where the year should go — it updates automatically every January." />  
            </div>
          </Card>
        </div>
      )}

      {tab === 'contact' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" value={v.contact?.email || ''} onChange={(e) => form.set('contact.email', e.target.value)} />
              <Input label="Phone" value={v.contact?.phone || ''} onChange={(e) => form.set('contact.phone', e.target.value)} />
              <Input label="Address" value={v.contact?.address || ''} onChange={(e) => form.set('contact.address', e.target.value)} className="sm:col-span-2" />
              <Input label="City" value={v.contact?.city || ''} onChange={(e) => form.set('contact.city', e.target.value)} />
              <Input label="Country" value={v.contact?.country || ''} onChange={(e) => form.set('contact.country', e.target.value)} />
              <Input label="Office hours" value={v.contact?.officeHours || ''} onChange={(e) => form.set('contact.officeHours', e.target.value)} />
              <Input label="Map link" value={v.contact?.mapUrl || ''} onChange={(e) => form.set('contact.mapUrl', e.target.value)} placeholder="https://maps.google.com/…" />
            </div>
          </Card>
          <Card title="Social profiles">
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL.map((s) => (
                <Input key={s} label={s === 'x' ? 'X (Twitter)' : s[0].toUpperCase() + s.slice(1)} value={v.social?.[s] || ''} onChange={(e) => form.set(`social.${s}`, e.target.value)} placeholder="https://…" />
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'enquiries' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Enquiry form">
            <div className="space-y-5">
              <div>
                <p className="field-label">Budget ranges</p>
                <StringListEditor items={v.enquiry?.budgetRanges || []} onChange={(x) => form.set('enquiry.budgetRanges', x)} placeholder="e.g. ₦5m – ₦20m" addLabel="Add range" max={12} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Currency (ISO code)" value={v.enquiry?.currency || 'NGN'} onChange={(e) => form.set('enquiry.currency', e.target.value.toUpperCase().slice(0, 3))} />
                <Input label="Saved drafts expire after (days)" type="number" min={1} max={60} value={v.enquiry?.draftExpiryDays ?? 14} onChange={(e) => form.set('enquiry.draftExpiryDays', Number(e.target.value))} />
              </div>
              <Textarea label="Privacy notice (shown on forms)" rows={3} value={v.enquiry?.privacyNotice || ''} onChange={(e) => form.set('enquiry.privacyNotice', e.target.value)} maxLength={1000} />
            </div>
          </Card>
          <Card title="Staff notifications" description="Who gets an email for new submissions (requires Brevo).">
            <div className="space-y-5">
              <CommaListInput label="New enquiry emails" value={v.notifications?.enquiryEmails || []} onChange={(x) => form.set('notifications.enquiryEmails', x)} hint="Comma separated email addresses" />
              <CommaListInput label="Contact form emails" value={v.notifications?.contactEmails || []} onChange={(x) => form.set('notifications.contactEmails', x)} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'seo' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Default SEO">
            <SeoFields value={v.seo || {}} onChange={(x) => form.set('seo', x)} fallbackTitle={v.studioName} />
          </Card>
          <div className="space-y-6">
            <Card title="Public search" description="Which content appears in website search. Private and unpublished content is never searchable.">
              <div className="space-y-4">
                {['services', 'productions', 'news', 'founder'].map((k) => (
                  <Switch key={k} checked={v.search?.[k] !== false} onChange={(x) => form.set(`search.${k}`, x)} label={k[0].toUpperCase() + k.slice(1)} />
                ))}
              </div>
            </Card>
            <Card title="Analytics">
              <Input label="Google Analytics measurement ID" value={v.analytics?.googleAnalyticsId || ''} onChange={(e) => form.set('analytics.googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXX" hint="Only load analytics after visitor consent where required." />
            </Card>
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <Card title="Content approval" description="Controls whether website content needs a second person to approve it before publishing.">
          <div className="flex items-start gap-4">
            <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-app-accent" aria-hidden />
            <div className="flex-1 space-y-4">
              <Switch
                checked={v.workflow?.contentApprovalRequired !== false}
                onChange={toggleApproval}
                disabled={!user.role?.isSuperAdmin}
                label="Require approval before publishing"
                description={user.role?.isSuperAdmin ? 'Recommended. Only Super Admins can change this.' : 'Only a Super Admin can change this setting.'}
              />
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
