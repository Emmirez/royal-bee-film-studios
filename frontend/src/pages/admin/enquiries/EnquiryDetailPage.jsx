import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Mail, Paperclip, Phone, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { Badge, Card, ErrorState, PageLoader, StatusBadge } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatBytes, formatDate, formatDateTime, formatMoney, titleCase } from '../../../lib/format';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'closed', 'spam'];

function Row({ label, children }) {
  if (children === undefined || children === null || children === '' || (Array.isArray(children) && !children.length)) return null;
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-app-subtle">{label}</dt>
      <dd className="whitespace-pre-line text-sm">{children}</dd>
    </div>
  );
}

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const { data: e, isLoading, error, refetch } = useAdminItem('/enquiries', id);
  const { data: staff } = useAdminList('/users', { status: 'active', limit: 100 }, { enabled: can(P.ENQUIRIES_ASSIGN) && can(P.USERS_VIEW) });
  const [note, setNote] = useState('');
  const patch = useAdminMutation('/enquiries', (body) => api.patch(`/enquiries/${id}`, body));
  const assign = useAdminMutation('/enquiries', (userId) => api.post(`/enquiries/${id}/assign`, { userId }));
  const addNote = useAdminMutation('/enquiries', (text) => api.post(`/enquiries/${id}/notes`, { text }));

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const download = async (att) => {
    try {
      const { data } = await api.get(`/enquiries/${id}/attachments/${att._id}`);
      window.open(data.url, '_blank', 'noopener');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const run = (p, msg) => p.then(() => toast.success(msg)).catch((err) => toast.error(err.message));
  const staffOptions = (staff?.data || []).map((u) => ({ value: u.id, label: u.fullName, description: u.role?.name }));
  if (e.assignedTo && !staffOptions.some((o) => o.value === e.assignedTo._id)) staffOptions.push({ value: e.assignedTo._id, label: `${e.assignedTo.firstName} ${e.assignedTo.lastName}` });

  return (
    <>
      <button type="button" onClick={() => navigate('/admin/enquiries')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" /> All enquiries
      </button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-app-subtle">{e.reference}</p>
          <h1 className="font-display text-3xl font-semibold">{e.projectTitle || e.serviceTitle || 'Project enquiry'}</h1>
          <p className="mt-1 text-sm text-app-subtle">Received {formatDateTime(e.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={e.status} />
          {e.possibleDuplicateOf && <Badge tone="warning">Possible duplicate of {e.possibleDuplicateOf.reference}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Project">
            <dl className="divide-y divide-app-border">
              <Row label="Service">{e.service ? <Link to={`/admin/website/services/${e.service._id}`} className="underline underline-offset-4">{e.service.title}</Link> : e.serviceTitle || 'Not sure yet'}</Row>
              <Row label="Description">{e.description}</Row>
              {Object.entries(e.answers || {}).map(([k, v]) => (
                <Row key={k} label={titleCase(k)}>
                  {Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                </Row>
              ))}
              <Row label="Budget">{[e.budgetRange, e.budgetAmount != null && formatMoney(e.budgetAmount, e.currency)].filter(Boolean).join(' · ')}</Row>
              <Row label="Dates">{[e.preferredDates?.start && formatDate(e.preferredDates.start), e.preferredDates?.end && formatDate(e.preferredDates.end)].filter(Boolean).join(' → ')}{e.preferredDates?.flexible ? ' (flexible)' : ''}</Row>
              <Row label="Location">{e.location}</Row>
              <Row label="Deliverables">{e.deliverables?.join(', ')}</Row>
              <Row label="Source">{[e.source?.page, e.source?.utm?.source && `utm: ${e.source.utm.source}/${e.source.utm.medium || ''}/${e.source.utm.campaign || ''}`].filter(Boolean).join(' · ')}</Row>
            </dl>
          </Card>

          {e.attachments?.length > 0 && (
            <Card title="Attachments" description="Private files — download links expire after 5 minutes.">
              <ul className="space-y-2">
                {e.attachments.map((a) => (
                  <li key={a._id} className="flex items-center gap-3 rounded-xl border border-app-border px-4 py-3 text-sm">
                    <Paperclip className="h-4 w-4 text-app-subtle" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-app-subtle">{formatBytes(a.size)}</span>
                    <Button size="sm" variant="ghost" icon={Download} onClick={() => download(a)}>
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Internal notes" description="Visible to staff only.">
            <ul className="mb-4 space-y-3">
              {e.notes?.length === 0 && <li className="text-sm text-app-subtle">No notes yet.</li>}
              {e.notes?.map((n) => (
                <li key={n._id} className="rounded-xl bg-app-muted px-4 py-3 text-sm">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-xs text-app-subtle">
                    {n.by ? `${n.by.firstName} ${n.by.lastName}` : 'Staff'} · {formatDateTime(n.at)}
                  </p>
                </li>
              ))}
            </ul>
            {can(P.ENQUIRIES_MANAGE) && (
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (note.trim()) run(addNote.mutateAsync(note.trim()), 'Note added').then(() => setNote(''));
                }}
                className="space-y-2"
              >
                <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} rows={3} placeholder="Add a note…" aria-label="New note" />
                <Button type="submit" size="sm" loading={addNote.isPending} disabled={!note.trim()}>
                  Add note
                </Button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <UserRound className="h-4 w-4 text-app-subtle" aria-hidden /> {e.contact.name}
                {e.contact.organization && <span className="font-normal text-app-subtle">· {e.contact.organization}</span>}
              </p>
              <a href={`mailto:${e.contact.email}?subject=${encodeURIComponent(`Re: ${e.reference}`)}`} className="flex items-center gap-2 underline-offset-4 hover:underline">
                <Mail className="h-4 w-4 text-app-subtle" aria-hidden /> {e.contact.email}
              </a>
              {e.contact.phone && (
                <a href={`tel:${e.contact.phone}`} className="flex items-center gap-2 underline-offset-4 hover:underline">
                  <Phone className="h-4 w-4 text-app-subtle" aria-hidden /> {e.contact.phone}
                </a>
              )}
              <p className="text-app-subtle">Prefers: {titleCase(e.preferredContactMethod)}</p>
              <p className="text-app-subtle">Marketing consent: {e.consent?.marketing ? 'Yes' : 'No'}</p>
              {e.crmContact && can(P.CRM_VIEW) && (
                <Button to={`/admin/contacts/${e.crmContact._id}`} size="sm" variant="secondary">
                  Open CRM contact ({e.crmContact.enquiryCount} enquir{e.crmContact.enquiryCount === 1 ? 'y' : 'ies'})
                </Button>
              )}
            </div>
          </Card>

          <Card title="Handling">
            <div className="space-y-4">
              <Select label="Status" value={e.status} disabled={!can(P.ENQUIRIES_MANAGE)} onChange={(status) => run(patch.mutateAsync({ status }), 'Status updated')} options={STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />
              {can(P.ENQUIRIES_ASSIGN) && (
                <Select label="Assigned to" clearable searchable value={e.assignedTo?._id || null} onChange={(userId) => run(assign.mutateAsync(userId || null), userId ? 'Enquiry assigned' : 'Unassigned')} options={staffOptions} placeholder="Unassigned" />
              )}
              <Input
                label="Follow-up date"
                type="date"
                disabled={!can(P.ENQUIRIES_MANAGE)}
                value={e.followUpAt ? String(e.followUpAt).slice(0, 10) : ''}
                onChange={(ev) => run(patch.mutateAsync({ followUpAt: ev.target.value || null }), 'Follow-up date saved')}
              />
            </div>
          </Card>

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {[...(e.history || [])].reverse().map((h, i) => (
                <li key={i} className="border-l-2 border-app-border pl-3">
                  <p className="font-medium">{titleCase(h.action)}{h.to ? ` → ${titleCase(h.to)}` : ''}</p>
                  <p className="text-xs text-app-subtle">{h.by ? `${h.by.firstName} ${h.by.lastName} · ` : ''}{formatDateTime(h.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
