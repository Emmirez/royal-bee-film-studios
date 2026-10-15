import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { Badge, ErrorState, PageHeader, PageLoader, Switch } from '../../../components/ui/Primitives';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';

/** Custom roles with granular permissions. The Super Admin role can't be edited. */
export default function RolesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch } = useAdminList('/roles', {});
  const { data: groups = [] } = useQuery({ queryKey: ['admin', '/roles', 'permissions'], queryFn: async () => (await api.get('/roles/permissions')).data });
  const [editing, setEditing] = useState(null);
  const save = useAdminMutation('/roles', (r) => (r._id ? api.patch(`/roles/${r._id}`, { name: r.name, description: r.description, permissions: r.permissions, requiresMfa: r.requiresMfa }) : api.post('/roles', { name: r.name, description: r.description, permissions: r.permissions, requiresMfa: r.requiresMfa })));
  const remove = useAdminMutation('/roles', (id) => api.del(`/roles/${id}`));

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const roles = data?.data || [];

  const toggle = (perm) => setEditing((r) => ({ ...r, permissions: r.permissions.includes(perm) ? r.permissions.filter((p) => p !== perm) : [...r.permissions, perm] }));
  const toggleGroup = (g) => {
    const keys = g.permissions.map((p) => p.key);
    const all = keys.every((k) => editing.permissions.includes(k));
    setEditing((r) => ({ ...r, permissions: all ? r.permissions.filter((p) => !keys.includes(p)) : [...new Set([...r.permissions, ...keys])] }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Roles & permissions"
        description="Permissions are enforced by the server on every request. Changes apply immediately to everyone with the role."
        actions={<Button icon={Plus} onClick={() => setEditing({ name: '', description: '', permissions: [], requiresMfa: false })}>New role</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <div key={r._id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{r.name}</h2>
                <p className="mt-1 text-sm text-app-subtle">{r.description}</p>
              </div>
              {r.isSuperAdmin && <Lock className="h-4 w-4 text-app-subtle" aria-label="Locked" />}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge>{r.portal}</Badge>
              <Badge tone="info">{r.isSuperAdmin ? 'All permissions' : `${r.permissions.length} permissions`}</Badge>
              <Badge>{r.userCount} account{r.userCount === 1 ? '' : 's'}</Badge>
              {r.requiresMfa && <Badge tone="gold">MFA required</Badge>}
              {r.isSystem && <Badge>System</Badge>}
            </div>
            {!r.isSuperAdmin && r.portal === 'staff' && (
              <div className="mt-5 flex gap-2 border-t border-app-border pt-4">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing({ ...r })}>
                  Edit
                </Button>
                {!r.isSystem && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    className="text-status-danger"
                    onClick={async () => (await confirm({ title: `Delete the ${r.name} role?`, message: 'Roles that are still assigned can’t be deleted.', tone: 'danger', confirmLabel: 'Delete' })) && remove.mutateAsync(r._id).then(() => toast.success('Role deleted')).catch((e) => toast.error(e.message))}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? `Edit ${editing.name}` : 'New role'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              disabled={!editing?.name?.trim()}
              onClick={async () => {
                if (editing._id && !(await confirm({ title: 'Update permissions?', message: `This immediately changes access for everyone with the ${editing.name} role.`, confirmLabel: 'Update role' }))) return;
                save.mutateAsync(editing).then(() => { toast.success('Role saved'); setEditing(null); }).catch((e) => toast.error(e.message));
              }}
            >
              Save role
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Role name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <Switch checked={editing.requiresMfa} onChange={(v) => setEditing({ ...editing, requiresMfa: v })} label="Require two-factor authentication" description="Recommended for anyone who can publish, manage staff or change settings." />
            <div className="space-y-4">
              {groups.map((g) => {
                const keys = g.permissions.map((p) => p.key);
                const all = keys.every((k) => editing.permissions.includes(k));
                return (
                  <fieldset key={g.key} className="rounded-xl border border-app-border p-4">
                    <legend className="flex w-full items-center justify-between gap-3 px-1">
                      <span className="text-sm font-semibold">{g.label}</span>
                    </legend>
                    <button type="button" onClick={() => toggleGroup(g)} className="mb-2 text-xs font-semibold text-app-accent hover:underline">
                      {all ? 'Clear all' : 'Select all'}
                    </button>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {g.permissions.map((p) => (
                        <label key={p.key} className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-sm hover:bg-app-muted">
                          <input type="checkbox" checked={editing.permissions.includes(p.key)} onChange={() => toggle(p.key)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--app-accent))]" />
                          <span>
                            {p.label}
                            <span className="block font-mono text-[11px] text-app-subtle">{p.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
