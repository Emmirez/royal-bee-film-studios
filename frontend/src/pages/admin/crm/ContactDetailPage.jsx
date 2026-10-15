import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import CommaListInput from '../../../components/ui/CommaListInput';
import { Card, ErrorState, PageLoader, StatusBadge } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDate, formatDateTime, titleCase } from '../../../lib/format';

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const { data: c, isLoading, error, refetch } = useAdminItem('/crm/contacts', id);
  const { data: staff } = useAdminList('/users', { status: 'active', limit: 100 }, { enabled: can(P.USERS_VIEW) });
  const [form, setForm] = useState(null);
  const [note, setNote] = useState('');
  const save = useAdminMutation('/crm/contacts', (body) => api.patch(`/crm/contacts/${id}`, body));
  const addNote = useAdminMutation('/crm/contacts', (text) => api.post(`/crm/contacts/${id}/notes`, { text }));

  useEffect(() => {
    if (c) {
      setForm({
        name: c.name,
        phone: c.phone || '',
        organization: c.organization || '',
        kind: c.kind,
        stage: c.stage,
        owner: c.owner?._id || null,
        followUpAt: c.followUpAt ? String(c.followUpAt).slice(0, 10) : '',
        preferredContactMethod: c.preferredContactMethod,
        tags: c.tags || [],
      });
    }
  }, [c]);

  if (isLoading || !form) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const canEdit = can(P.CRM_MANAGE);
  const ownerOptions = (staff?.data || []).map((u) => ({ value: u.id, label: u.fullName }));

  return (
    <>
      <button type="button" onClick={() => navigate('/admin/contacts')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" /> All contacts
      </button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{c.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-app-subtle">
            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-app-text"><Mail className="h-4 w-4" /> {c.email}</a>
            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-app-text"><Phone className="h-4 w-4" /> {c.phone}</a>}
          </p>
        </div>
        <StatusBadge status={c.stage} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Details" actions={canEdit && <Button size="sm" icon={Save} loading={save.isPending} onClick={() => save.mutateAsync({ ...form, followUpAt: form.followUpAt || null }).then(() => toast.success('Contact saved')).catch((e) => toast.error(e.message))}>Save</Button>}>
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            <Select label="Type" value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={[{ value: 'individual', label: 'Individual' }, { value: 'organization', label: 'Organization' }]} />
            <Select label="Stage" value={form.stage} onChange={(v) => setForm({ ...form, stage: v })} options={['lead', 'prospect', 'client', 'inactive'].map((s) => ({ value: s, label: titleCase(s) }))} />
            <Select label="Owner" clearable value={form.owner} onChange={(v) => setForm({ ...form, owner: v })} options={ownerOptions} placeholder="No owner" />
            <Input label="Follow-up date" type="date" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} />
            <Select label="Prefers" value={form.preferredContactMethod} onChange={(v) => setForm({ ...form, preferredContactMethod: v })} options={[{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }, { value: 'any', label: 'Either' }]} />
            <CommaListInput label="Tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} className="sm:col-span-2" />
          </fieldset>
          <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-app-border pt-4 text-sm">
            <dt className="text-app-subtle">First source</dt>
            <dd>{c.firstSource}</dd>
            <dt className="text-app-subtle">Marketing consent</dt>
            <dd>{c.consent?.marketing ? `Yes (${formatDate(c.consent.marketingAt)})` : 'No'}</dd>
            <dt className="text-app-subtle">Interested in</dt>
            <dd>{c.servicesOfInterest?.map((s) => s.title).join(', ') || '—'}</dd>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card title="Enquiries & messages" bodyClassName="p-0">
            <ul className="divide-y divide-app-border">
              {c.enquiries.map((e) => (
                <li key={e._id}>
                  <Link to={`/admin/enquiries/${e._id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-app-muted">
                    <span>
                      <span className="font-mono text-xs">{e.reference}</span> · {e.serviceTitle || 'General'}
                      <span className="block text-xs text-app-subtle">{formatDate(e.createdAt)}</span>
                    </span>
                    <StatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
              {c.messages.map((m) => (
                <li key={m._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    Message · {m.subject || 'No subject'}
                    <span className="block text-xs text-app-subtle">{formatDate(m.createdAt)}</span>
                  </span>
                  <StatusBadge status={m.status} />
                </li>
              ))}
              {!c.enquiries.length && !c.messages.length && <li className="px-5 py-6 text-sm text-app-subtle">Nothing yet.</li>}
            </ul>
          </Card>

          <Card title="Notes & activity">
            {canEdit && (
              <form
                className="mb-5 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (note.trim()) addNote.mutateAsync(note.trim()).then(() => { setNote(''); toast.success('Note added'); refetch(); }).catch((err) => toast.error(err.message));
                }}
              >
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" aria-label="New note" />
                <Button type="submit" size="sm" disabled={!note.trim()} loading={addNote.isPending}>
                  Add note
                </Button>
              </form>
            )}
            <ol className="space-y-3 text-sm">
              {c.activity.map((a, i) => (
                <li key={i} className="border-l-2 border-app-border pl-3">
                  <p className="font-medium">{titleCase(a.type)}</p>
                  {a.summary && <p className="text-app-subtle">{a.summary}</p>}
                  <p className="text-xs text-app-subtle">{formatDateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
