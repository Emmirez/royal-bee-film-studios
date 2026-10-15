import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FolderKanban, MoreHorizontal, Search, UserPlus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { Avatar, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, StatusBadge, Tabs } from '../../../components/ui/Primitives';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { timeAgo } from '../../../lib/format';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', organization: '' };

function InviteResult({ result, onClose }) {
  const toast = useToast();
  if (!result) return null;
  const { invite, client } = result;
  return (
    <Modal open onClose={onClose} title="Client invited" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-3 text-sm text-app-subtle">
        {invite.emailStatus === 'sent' ? (
          <p>
            We emailed <span className="font-semibold text-app-text">{client.email}</span> a link to set up their portal account. It expires {new Date(invite.expiresAt).toLocaleString('en-GB')}.
          </p>
        ) : (
          <>
            <p>The email couldn’t be sent, so share this single-use link with {client.firstName} yourself:</p>
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

/** Staff: client portal accounts (invite-only). */
export default function ClientsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [inviteResult, setInviteResult] = useState(null);
  const [menu, setMenu] = useState(null);
  const { data, isLoading, error, refetch } = useAdminList('/clients', { status, q, page });

  const invite = useAdminMutation('/clients', (body) => api.post('/clients', body).then((r) => r.data));
  const update = useAdminMutation('/clients', ({ id, ...body }) => api.patch(`/clients/${id}`, body).then((r) => r.data));
  const action = useAdminMutation('/clients', ({ id, name }) => api.post(`/clients/${id}/${name}`).then((r) => r.data));
  const manage = can(P.CLIENTS_MANAGE);

  const set = (k) => (e) => setEditing((v) => ({ ...v, [k]: e.target.value }));

  const save = async () => {
    setErrors({});
    const { id, email, ...rest } = editing;
    try {
      if (id) {
        await update.mutateAsync({ id, ...rest });
        toast.success('Client updated');
      } else {
        setInviteResult(await invite.mutateAsync({ ...rest, email }));
      }
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const doAction = async (c, name) => {
    setMenu(null);
    const copy = {
      deactivate: { title: `Deactivate ${c.fullName}?`, message: 'They’ll be signed out and can’t open the portal until you reactivate them. Their projects are kept.', tone: 'danger', confirmLabel: 'Deactivate' },
      reactivate: { title: `Reactivate ${c.fullName}?`, confirmLabel: 'Reactivate' },
      'resend-invite': { title: 'Resend the invitation?', message: 'Earlier invitation links will stop working.', confirmLabel: 'Resend' },
    }[name];
    if (!(await confirm(copy))) return;
    try {
      const res = await action.mutateAsync({ id: c.id, name });
      if (name === 'resend-invite') setInviteResult({ invite: res.invite, client: c });
      else toast.success('Done');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Client accounts"
        description="Clients join the portal by invitation only. They see their own projects, review work and message the team."
        actions={manage && <Button icon={UserPlus} onClick={() => { setErrors({}); setEditing({ ...EMPTY }); }}>Invite client</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'invited', label: 'Invited' }, { value: 'deactivated', label: 'Deactivated' }]} />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search clients…" prefix={<Search className="h-4 w-4" />} className="lg:w-72" aria-label="Search clients" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={UserPlus} title="No clients yet" message="Invite a client to give them their own portal." action={manage && <Button icon={UserPlus} onClick={() => setEditing({ ...EMPTY })}>Invite client</Button>} />
      ) : (
        <div className="card overflow-visible">
          <ul className="divide-y divide-app-border">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar name={c.fullName} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.fullName}</p>
                  <p className="truncate text-xs text-app-subtle">
                    {c.organization ? `${c.organization} · ` : ''}
                    {c.email}
                  </p>
                </div>
                <div className="hidden flex-col items-end gap-1 text-xs text-app-subtle md:flex">
                  <Link to={`/admin/projects?clientId=${c.id}`} className="inline-flex items-center gap-1 font-semibold text-app-text hover:underline">
                    <FolderKanban className="h-3.5 w-3.5" aria-hidden /> {c.projectCount} project{c.projectCount === 1 ? '' : 's'}
                  </Link>
                  <span>{c.lastLoginAt ? `Active ${timeAgo(c.lastLoginAt)}` : 'Never signed in'}</span>
                </div>
                <StatusBadge status={c.status} />
                {manage && (
                  <div className="relative">
                    <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${c.fullName}`} aria-haspopup="menu" aria-expanded={menu === c.id} onClick={() => setMenu(menu === c.id ? null : c.id)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menu === c.id && (
                      <div role="menu" className="absolute right-0 z-20 mt-1 w-52 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                        <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => { setMenu(null); setErrors({}); setEditing({ id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone || '', organization: c.organization || '' }); }}>
                          Edit details
                        </button>
                        <Link role="menuitem" to={`/admin/projects?new=1&clientId=${c.id}`} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted">
                          New project for this client
                        </Link>
                        {c.status === 'invited' && (
                          <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => doAction(c, 'resend-invite')}>
                            Resend invitation
                          </button>
                        )}
                        {c.status === 'deactivated' ? (
                          <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => doAction(c, 'reactivate')}>
                            Reactivate
                          </button>
                        ) : (
                          <button role="menuitem" type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={() => doAction(c, 'deactivate')}>
                            Deactivate
                          </button>
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
        title={editing?.id ? 'Edit client' : 'Invite a client'}
        description={editing?.id ? undefined : 'They’ll get an email with a link to choose their password and open their portal.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={invite.isPending || update.isPending} onClick={save}>
              {editing?.id ? 'Save' : 'Send invitation'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" required value={editing.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Input label="Last name" required value={editing.lastName} onChange={set('lastName')} error={errors.lastName} />
            {!editing.id && <Input label="Email" type="email" required value={editing.email} onChange={set('email')} error={errors.email} className="sm:col-span-2" />}
            <Input label="Phone" value={editing.phone} onChange={set('phone')} />
            <Input label="Company / organisation" value={editing.organization} onChange={set('organization')} maxLength={160} />
          </div>
        )}
      </Modal>

      <InviteResult result={inviteResult} onClose={() => setInviteResult(null)} />
    </>
  );
}