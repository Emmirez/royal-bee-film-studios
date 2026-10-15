import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { Switch } from '../../components/ui/Primitives';
import { useAdminList } from '../admin/adminApi';
import { useAuth } from '../../context/AuthContext';
import { P } from '../../lib/permissions';
import { PROJECT_STAGES, PROJECT_STATUSES } from './projectUi';

export const EMPTY_PROJECT = {
  title: '',
  clientId: null,
  serviceTitle: '',
  summary: '',
  stage: 'briefing',
  status: 'active',
  startDate: '',
  dueDate: '',
  managerId: null,
  visibleToClient: true,
};

const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

/** Turn an API project into form values. */
export const projectToForm = (p) => ({
  title: p.title,
  clientId: p.client?.id || null,
  serviceTitle: p.serviceTitle || '',
  summary: p.summary || '',
  stage: p.stage,
  status: p.status,
  startDate: toDateInput(p.startDate),
  dueDate: toDateInput(p.dueDate),
  managerId: p.manager?.id || null,
  visibleToClient: p.visibleToClient,
});

/** Fields shared by "New project" and "Edit project". */
export default function ProjectForm({ value, onChange, errors = {} }) {
  const { can } = useAuth();
  const set = (k) => (e) => onChange({ ...value, [k]: e?.target ? e.target.value : e });
  const { data: clients } = useAdminList('/clients', { limit: 200 }, { staleTime: 60_000 });
  const { data: staff } = useAdminList('/users', { status: 'active', limit: 100 }, { staleTime: 60_000, enabled: can(P.USERS_VIEW) });
  const { data: services } = useAdminList('/cms/services', { limit: 100 }, { staleTime: 60_000, enabled: can(P.CMS_VIEW) });

  const clientOptions = (clients?.data || [])
    .filter((c) => c.status !== 'deactivated')
    .map((c) => ({ value: c.id, label: c.fullName, description: [c.organization, c.email].filter(Boolean).join(' · ') }));
  const staffOptions = (staff?.data || []).map((u) => ({ value: u.id, label: u.fullName, description: u.jobTitle || u.role?.name }));
  const serviceTitles = [...new Set((services?.data || []).map((s) => s.title).filter(Boolean))];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Project title" required value={value.title} onChange={set('title')} error={errors.title} maxLength={160} className="sm:col-span-2" placeholder="e.g. Brand film — spring campaign" />
      <Select
        label="Client"
        required
        value={value.clientId}
        onChange={set('clientId')}
        options={clientOptions}
        error={errors.clientId}
        searchable
        placeholder={clientOptions.length ? 'Choose a client…' : 'Invite a client first'}
        hint="Only clients with a portal account appear here."
      />
      <Select
        label="Project manager"
        value={value.managerId}
        onChange={set('managerId')}
        options={staffOptions}
        error={errors.managerId}
        clearable
        searchable
        placeholder={can(P.USERS_VIEW) ? 'Optional' : 'Not available for your role'}
        disabled={!can(P.USERS_VIEW)}
        hint="Gets the emails when the client replies."
      />
      <Input label="Service" value={value.serviceTitle} onChange={set('serviceTitle')} list="project-services" maxLength={120} placeholder="e.g. Commercials" />
      <datalist id="project-services">
        {serviceTitles.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Select label="Stage" value={value.stage} onChange={set('stage')} options={PROJECT_STAGES} />
      <Input label="Start date" type="date" value={value.startDate} onChange={set('startDate')} />
      <Input label="Target delivery" type="date" value={value.dueDate} onChange={set('dueDate')} />
      <Select label="Status" value={value.status} onChange={set('status')} options={PROJECT_STATUSES} />
      <Textarea label="Summary for the client" rows={4} value={value.summary} onChange={set('summary')} maxLength={3000} className="sm:col-span-2" placeholder="What we’re making, key dates, anything the client should know." />
      <Switch
        className="rounded-xl border border-app-border p-4 sm:col-span-2"
        checked={value.visibleToClient}
        onChange={set('visibleToClient')}
        label="Show in the client’s portal"
        description="Turn off while you’re still setting things up — the client won’t see it or get emails until it’s on."
      />
    </div>
  );
}