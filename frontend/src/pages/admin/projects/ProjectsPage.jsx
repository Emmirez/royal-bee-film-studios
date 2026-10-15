import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, EyeOff, FolderKanban, MessageCircle, MessageSquareWarning, Plus, Search, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Pagination, Tabs } from '../../../components/ui/Primitives';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import ProjectForm, { EMPTY_PROJECT } from '../../../features/projects/ProjectForm';
import { ProjectStatusBadge, PROJECT_STAGES } from '../../../features/projects/projectUi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { cx, formatDate, timeAgo } from '../../../lib/format';

const AWAITING = { reply: 'Client messages awaiting reply', changes: 'Change requests from clients' };

/** Staff: all client projects. */
export default function ProjectsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const awaiting = params.get('awaiting') || '';
  const clientId = params.get('clientId') || '';
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(null);
  const [errors, setErrors] = useState({});

  const query = { q, page, awaiting: awaiting || undefined, clientId: clientId || undefined, status: awaiting ? undefined : status || undefined };
  const { data, isLoading, error, refetch } = useAdminList('/projects', query);
  const create = useAdminMutation('/projects', (body) => api.post('/projects', body).then((r) => r.data));

  // Opened from Client accounts → "New project for this client"
  useEffect(() => {
    if (params.get('new') && can(P.PROJECTS_MANAGE)) {
      setCreating({ ...EMPTY_PROJECT, clientId: clientId || null });
      const next = new URLSearchParams(params);
      next.delete('new');
      next.delete('clientId');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setErrors({});
    try {
      const project = await create.mutateAsync({ ...creating, startDate: creating.startDate || null, dueDate: creating.dueDate || null });
      toast.success(project.visibleToClient ? 'Project created — the client has been notified' : 'Project created (hidden from the client for now)');
      setCreating(null);
      navigate(`/admin/projects/${project.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const clearFilter = () => setParams({}, { replace: true });
  const items = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Projects"
        description="Every client project in one place. Clients follow progress, review deliverables and message you from their portal."
        actions={can(P.PROJECTS_MANAGE) && <Button icon={Plus} onClick={() => { setErrors({}); setCreating({ ...EMPTY_PROJECT }); }}>New project</Button>}
      />

      {(awaiting || clientId) && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          <span className="font-semibold">{awaiting ? AWAITING[awaiting] : 'Showing one client’s projects'}</span>
          <Button size="sm" variant="ghost" icon={X} onClick={clearFilter}>
            Show all projects
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!awaiting ? (
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            tabs={[{ value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On hold' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: '', label: 'All' }]}
          />
        ) : (
          <span />
        )}
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search title, reference or client…" prefix={<Search className="h-4 w-4" />} className="lg:w-80" aria-label="Search projects" />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={awaiting ? 'Nothing waiting — all caught up' : 'No projects here'}
          message={awaiting ? undefined : 'Create a project for a client to start sharing progress with them.'}
          action={!awaiting && can(P.PROJECTS_MANAGE) && <Button icon={Plus} onClick={() => setCreating({ ...EMPTY_PROJECT })}>New project</Button>}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((p) => {
            const stageIndex = PROJECT_STAGES.findIndex((s) => s.value === p.stage);
            return (
              <li key={p.id} className="min-w-0">
                <Link to={`/admin/projects/${p.id}`} className="card block h-full p-5 transition hover:border-app-text/30 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-app-subtle">{p.reference}</p>
                      <p className="mt-0.5 truncate font-display text-xl font-semibold">{p.title}</p>
                      <p className="truncate text-sm text-app-subtle">
                        {p.client?.name || 'Unknown client'}
                        {p.client?.organization ? ` · ${p.client.organization}` : ''}
                      </p>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>

                  {/* stage progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{p.stageLabel}</span>
                      <span className="text-app-subtle">
                        Stage {stageIndex + 1} of {PROJECT_STAGES.length}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-1" aria-hidden>
                      {PROJECT_STAGES.map((s, i) => (
                        <span key={s.value} className={cx('h-1.5 flex-1 rounded-full', i <= stageIndex ? 'bg-app-accent' : 'bg-app-border')} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-app-subtle">
                    {p.awaitingStaffReply && (
                      <Badge tone="gold">
                        <MessageCircle className="h-3 w-3" aria-hidden /> Client is waiting for a reply
                      </Badge>
                    )}
                    {p.deliverables?.changes > 0 && (
                      <Badge tone="danger">
                        <MessageSquareWarning className="h-3 w-3" aria-hidden /> {p.deliverables.changes} change request{p.deliverables.changes > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {p.deliverables?.awaiting > 0 && <Badge tone="warning">{p.deliverables.awaiting} awaiting client review</Badge>}
                    {!p.visibleToClient && (
                      <Badge>
                        <EyeOff className="h-3 w-3" aria-hidden /> Hidden from client
                      </Badge>
                    )}
                    {p.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Due {formatDate(p.dueDate)}
                      </span>
                    )}
                    <span className="ml-auto">Updated {timeAgo(p.lastActivityAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />

      <Modal
        open={Boolean(creating)}
        onClose={() => setCreating(null)}
        title="New project"
        description="The client gets an email and sees it in their portal (unless you hide it)."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(null)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={save}>
              Create project
            </Button>
          </>
        }
      >
        {creating && <ProjectForm value={creating} onChange={setCreating} errors={errors} />}
      </Modal>
    </>
  );
}