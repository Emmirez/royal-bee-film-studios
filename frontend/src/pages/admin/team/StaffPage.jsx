import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, KeyRound, MailPlus, MoreHorizontal, Search, Trash2, UserPlus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { timeAgo, titleCase } from '../../../lib/format';

const EMPLOYMENT = ['full_time', 'part_time', 'contractor', 'freelance', 'intern', 'other'];
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: '', employmentStatus: 'full_time', roleId: null, photo: undefined };

function StaffForm({ value, onChange, roleOptions, errors, isNew }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e?.target ? e.target.value : e });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="First name" required value={value.firstName} onChange={set('firstName')} error={errors.firstName} />
      <Input label="Last name" required value={value.lastName} onChange={set('lastName')} error={errors.lastName} />
      {isNew && <Input label="Work email" type="email" required value={value.email} onChange={set('email')} error={errors.email} className="sm:col-span-2" />}
      <Input label="Phone" value={value.phone} onChange={set('phone')} />
      <Input label="Job title" value={value.jobTitle} onChange={set('jobTitle')} hint="Display only — permissions come from the role." />
      <Input label="Department" value={value.department} onChange={set('department')} />
      <Select label="Engagement" value={value.employmentStatus} onChange={set('employmentStatus')} options={EMPLOYMENT.map((e) => ({ value: e, label: titleCase(e) }))} />
      <Select label="Role" required value={value.roleId} onChange={set('roleId')} options={roleOptions} error={errors.roleId} className="sm:col-span-2" />
      <ImageField label="Profile photo" value={value.photo} onChange={(photo) => onChange({ ...value, photo })} folder="staff" aspect="1/1" withAlt={false} className="sm:col-span-2" />
    </div>
  );
}

function InviteResult({ result, onClose }) {
  const toast = useToast();
  if (!result) return null;
  const { invite, user } = result;
  return (
    <Modal open onClose={onClose} title="Invitation created" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-3 text-sm text-app-subtle">
        {invite.emailStatus === 'sent' ? (
          <p>We emailed an invitation to <span className="font-semibold text-app-text">{user.email}</span>. The link expires {new Date(invite.expiresAt).toLocaleString('en-GB')}.</p>
        ) : (
          <>
            <p>Email isn’t set up on the server yet, so no email was sent. Share this single-use link with {user.firstName} securely:</p>
            <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-raised p-2">
              <code className="min-w-0 flex-1 truncate text-xs">{invite.inviteLink}</code>
              <Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(invite.inviteLink).then(() => toast.success('Link copied'))}>
                Copy
              </Button>
            </div>
            <p className="text-xs">Expires {new Date(invite.expiresAt).toLocaleString('en-GB')}.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function StaffPage() {
  const { can, user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [inviteResult, setInviteResult] = useState(null);
  const [menu, setMenu] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/users', { status, q, page });
  const { data: roles } = useAdminList('/roles', { portal: 'staff' });
  const roleOptions = (roles?.data || [])
    .filter((r) => !r.isSuperAdmin || me.role?.isSuperAdmin)
    .map((r) => ({ value: r._id, label: r.name, description: r.description }));

  const invite = useAdminMutation('/users', (body) => api.post('/users', body).then((r) => r.data));
  const update = useAdminMutation('/users', ({ id, ...body }) => api.patch(`/users/${id}`, body).then((r) => r.data));
  const action = useAdminMutation('/users', ({ id, name }) => api.post(`/users/${id}/${name}`).then((r) => r.data));
  const removeUser = useAdminMutation('/users', (id) => api.del(`/users/${id}`));

  const deleteUser = async (u) => {
    setMenu(null);
    const ok = await confirm({
      title: `Delete ${u.fullName} permanently?`,
      message: 'This removes their account for good and can’t be undone. Enquiries and contacts assigned to them will become unassigned. The audit log keeps a record of the deletion.',
      tone: 'danger',
      confirmLabel: 'Delete permanently',
    });
    if (!ok) return;
    try {
      await removeUser.mutateAsync(u.id);
      toast.success(`${u.fullName} was deleted`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (params.get('invite') && can(P.USERS_MANAGE)) {
      setEditing({ ...EMPTY });
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setErrors({});
    const { id, email, ...rest } = editing;
    const body = { ...rest, photo: rest.photo?.url ? rest.photo : undefined };
    try {
      if (id) {
        await update.mutateAsync({ id, ...body });
        toast.success('Staff member updated');
      } else {
        const res = await invite.mutateAsync({ ...body, email });
        setInviteResult(res);
      }
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const doAction = async (u, name) => {
    setMenu(null);
    const copy = {
      deactivate: { title: `Deactivate ${u.fullName}?`, message: 'They will be signed out everywhere immediately and won’t be able to sign in.', tone: 'danger', confirmLabel: 'Deactivate' },
      reactivate: { title: `Reactivate ${u.fullName}?`, confirmLabel: 'Reactivate' },
      'revoke-sessions': { title: 'Sign out all sessions?', message: `${u.fullName} will be signed out on every device.`, confirmLabel: 'Sign out everywhere' },
      'resend-invite': { title: 'Resend invitation?', message: 'Previous invitation links stop working.', confirmLabel: 'Resend' },
    }[name];
    if (!(await confirm(copy))) return;
    try {
      const res = await action.mutateAsync({ id: u.id, name });
      if (name === 'resend-invite') setInviteResult({ invite: res.invite, user: u });
      else toast.success('Done');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description="Staff join by invitation only. Job titles are for display — access is controlled by roles."
        actions={can(P.USERS_MANAGE) && <Button icon={UserPlus} onClick={() => { setErrors({}); setEditing({ ...EMPTY }); }}>Invite staff</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'invited', label: 'Invited' }, { value: 'deactivated', label: 'Deactivated' }]} />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search staff…" prefix={<Search className="h-4 w-4" />} className="lg:w-72" aria-label="Search staff" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No staff found" />
      ) : (
        <div className="card overflow-visible">
          <ul className="divide-y divide-app-border">
            {items.map((u) => (
              <li key={u.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar name={u.fullName} photo={u.photo} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.fullName} {u.id === me.id && <span className="text-xs font-normal text-app-subtle">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-app-subtle">
                    {u.jobTitle || '—'} · {u.email}
                  </p>
                </div>
                <div className="hidden flex-col items-end gap-1 text-xs text-app-subtle md:flex">
                  <Badge tone={u.role?.isSuperAdmin ? 'dark' : 'neutral'}>{u.role?.name}</Badge>
                  <span>{u.lastLoginAt ? `Active ${timeAgo(u.lastLoginAt)}` : 'Never signed in'}</span>
                </div>
                {u.mfaEnabled && <KeyRound className="hidden h-4 w-4 text-status-success sm:block" aria-label="Two-factor enabled" />}
                <StatusBadge status={u.status} />
                {can(P.USERS_MANAGE) && u.id !== me.id && (
                  <div className="relative">
                    <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${u.fullName}`} aria-haspopup="menu" aria-expanded={menu === u.id} onClick={() => setMenu(menu === u.id ? null : u.id)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menu === u.id && (
                      <div role="menu" className="absolute right-0 z-20 mt-1 w-52 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                        <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => { setMenu(null); setErrors({}); setEditing({ id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', jobTitle: u.jobTitle || '', department: u.department || '', employmentStatus: u.employmentStatus, roleId: u.role?.id, photo: u.photo }); }}>
                          Edit details & role
                        </button>
                        {u.status === 'invited' && (
                          <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => doAction(u, 'resend-invite')}>
                            <MailPlus className="h-4 w-4" /> Resend invitation
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => doAction(u, 'revoke-sessions')}>
                            Sign out all sessions
                          </button>
                        )}
                        {u.status !== 'deactivated' ? (
                          <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={() => doAction(u, 'deactivate')}>
                            Deactivate account
                          </button>
                        ) : (
                                                <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => doAction(u, 'reactivate')}>
                            Reactivate account
                          </button>
                        )}
                        {u.status === 'deactivated' && me.role?.isSuperAdmin && (
                          <>
                            <div className="my-1 h-px bg-app-border" aria-hidden />
                            <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-status-danger hover:bg-status-danger/10" onClick={() => deleteUser(u)}>
                              <Trash2 className="h-4 w-4" aria-hidden /> Delete permanently
                            </button>
                          </>
                        )} 
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit staff member' : 'Invite a staff member'}
        description={editing?.id ? undefined : 'They’ll receive a secure, single-use link to set their own password.'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={invite.isPending || update.isPending} onClick={save}>
              {editing?.id ? 'Save changes' : 'Send invitation'}
            </Button>
          </>
        }
      >
        {editing && <StaffForm value={editing} onChange={setEditing} roleOptions={roleOptions} errors={errors} isNew={!editing.id} />}
      </Modal>
      <InviteResult result={inviteResult} onClose={() => setInviteResult(null)} />
    </>
  );
}
