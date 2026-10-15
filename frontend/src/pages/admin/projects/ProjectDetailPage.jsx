import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCheck, EyeOff, FilePlus2, Mail, MoreHorizontal, Pencil, RefreshCcw, Trash2, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import ImageField from '../../../components/admin/ImageField';
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoader } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { DocStatusBadge, money } from '../../../features/invoices/invoiceUi';
import ProjectForm, { projectToForm } from '../../../features/projects/ProjectForm';
import { DecisionHistory, DeliverablePreview, MessageThread, ProjectStatusBadge, PROJECT_STAGES, StageTimeline } from '../../../features/projects/projectUi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDate } from '../../../lib/format';

const EMPTY_DELIVERABLE = { title: '', description: '', link: '', previewImage: undefined, dueDate: '' };
const NOTIFY = { invalidate: [['admin', 'notifications']] };

function Detail({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-app-subtle">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children || '—'}</dd>
    </div>
  );
}

/** Invoices & quotes linked to this project. */
function ProjectInvoices({ project }) {
  const { can } = useAuth();
  const { data } = useAdminList('/invoices', { projectId: project.id, limit: 20 });
  const docs = data?.data || [];
  const base = `clientId=${project.client?.id}&projectId=${project.id}`;
  return (
    <Card title="Invoices & quotes" actions={can(P.INVOICES_MANAGE) && <Button size="sm" variant="secondary" to={`/admin/invoices/new?kind=invoice&${base}`}>New invoice</Button>}>
      {docs.length === 0 ? (
        <p className="text-sm text-app-subtle">
          Nothing yet.{' '}
          {can(P.INVOICES_MANAGE) && (
            <Link to={`/admin/invoices/new?kind=quote&${base}`} className="font-semibold text-app-text hover:underline">
              Create a quote
            </Link>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-app-border">
          {docs.map((d) => (
            <li key={d.id}>
              <Link to={`/admin/invoices/${d.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80">
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold">{d.reference}</span>
                  <span className="block text-xs text-app-subtle tabular">{money(d.total, d.currency)}</span>
                </span>
                <DocStatusBadge doc={d} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Staff: one client project — progress, deliverables and the conversation. */
export default function ProjectDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const manage = can(P.PROJECTS_MANAGE);
  const { data, isLoading, error, refetch } = useAdminItem('/projects', id);

  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [deliverable, setDeliverable] = useState(null); // { ...fields, id?, newVersion? }
  const [dErrors, setDErrors] = useState({});
  const [menu, setMenu] = useState(false);

  const update = useAdminMutation('/projects', (body) => api.patch(`/projects/${id}`, body).then((r) => r.data), NOTIFY);
  const remove = useAdminMutation('/projects', () => api.del(`/projects/${id}`), NOTIFY);
  const send = useAdminMutation('/projects', (body) => api.post(`/projects/${id}/messages`, body).then((r) => r.data), NOTIFY);
  const markReplied = useAdminMutation('/projects', () => api.post(`/projects/${id}/mark-replied`), NOTIFY);
  const saveDeliverable = useAdminMutation(
    '/projects',
    ({ did, ...body }) => (did ? api.patch(`/projects/${id}/deliverables/${did}`, body) : api.post(`/projects/${id}/deliverables`, body)).then((r) => r.data),
    NOTIFY,
  );
  const removeDeliverable = useAdminMutation('/projects', (did) => api.del(`/projects/${id}/deliverables/${did}`), NOTIFY);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { project, deliverables = [], messages = [] } = data;
  const stageIndex = PROJECT_STAGES.findIndex((s) => s.value === project.stage);
  const nextStage = PROJECT_STAGES[stageIndex + 1];

  const saveProject = async () => {
    setErrors({});
    try {
      await update.mutateAsync({ ...editing, startDate: editing.startDate || null, dueDate: editing.dueDate || null });
      toast.success('Project updated');
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const moveTo = async (stage) => {
    const label = PROJECT_STAGES.find((s) => s.value === stage)?.label;
    const ok = await confirm({
      title: `Move to ${label}?`,
      message: project.visibleToClient ? 'The client will get an email about the new stage.' : 'The project is hidden from the client, so no email will be sent.',
      confirmLabel: `Move to ${label}`,
    });
    if (!ok) return;
    try {
      await update.mutateAsync({ stage });
      toast.success(`Moved to ${label}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteProject = async () => {
    setMenu(false);
    const ok = await confirm({
      title: 'Delete this project?',
      message: 'Its deliverables and the whole conversation are deleted too. The client will no longer see it. This can’t be undone.',
      tone: 'danger',
      confirmLabel: 'Delete project',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync();
      toast.success('Project deleted');
      navigate('/admin/projects', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sendMessage = async (body) => {
    try {
      await send.mutateAsync(body);
      if (!body.internal) toast.success(project.visibleToClient ? 'Sent — the client has been emailed' : 'Saved (the project is hidden from the client)');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const submitDeliverable = async () => {
    setDErrors({});
    const { id: did, newVersion, title, description, link, previewImage, dueDate } = deliverable;
    const body = { title, description, link, previewImage: previewImage?.url ? { url: previewImage.url, publicId: previewImage.publicId || '', alt: previewImage.alt || '' } : null, dueDate: dueDate || null };
    try {
      await saveDeliverable.mutateAsync(did ? { did, ...body, newVersion: Boolean(newVersion) } : body);
      toast.success(did && !newVersion ? 'Deliverable updated' : project.visibleToClient ? 'Shared — the client has been asked to review it' : 'Deliverable added');
      setDeliverable(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setDErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const deleteDeliverable = async (d) => {
    const ok = await confirm({ title: `Delete “${d.title}”?`, message: 'Its review history is deleted too.', tone: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await removeDeliverable.mutateAsync(d.id);
      toast.success('Deliverable deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDeliverable = (d, newVersion = false) =>
    setDeliverable({ id: d.id, newVersion, title: d.title, description: d.description || '', link: d.link || '', previewImage: d.previewImage || undefined, dueDate: d.dueDate ? d.dueDate.slice(0, 10) : '' });

  return (
    <>
      <Link to="/admin/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All projects
      </Link>
      <PageHeader
        eyebrow={project.reference}
        title={project.title}
        description={`${project.client?.name || 'Unknown client'}${project.client?.organization ? ` · ${project.client.organization}` : ''}${project.serviceTitle ? ` · ${project.serviceTitle}` : ''}`}
        actions={
          manage && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={Pencil} onClick={() => { setErrors({}); setEditing(projectToForm(project)); }}>
                Edit
              </Button>
              <div className="relative">
                <Button size="icon" variant="ghost" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menu && (
                  <div role="menu" className="absolute right-0 z-20 mt-1 w-48 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={deleteProject}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete project
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }
      />

      {!project.visibleToClient && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-status-warning/15 px-4 py-3 text-sm text-status-warning">
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> Hidden from the client — they can’t see this project and won’t get emails. Turn on “Show in the client’s portal” under Edit when you’re ready.
        </p>
      )}

      <Card
        title="Progress"
        className="mb-6"
        actions={
          manage &&
          nextStage && (
            <Button size="sm" iconRight={ArrowRight} loading={update.isPending} onClick={() => moveTo(nextStage.value)}>
              Move to {nextStage.label}
            </Button>
          )
        }
      >
        <StageTimeline stage={project.stage} history={project.stageHistory} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card
            title="Deliverables"
            description="Share cuts, scripts and stills as links (Vimeo, YouTube, Google Drive, Frame.io…). The client approves each one or asks for changes."
            actions={manage && <Button size="sm" icon={FilePlus2} onClick={() => { setDErrors({}); setDeliverable({ ...EMPTY_DELIVERABLE }); }}>Add</Button>}
          >
            {deliverables.length === 0 ? (
              <EmptyState icon={FilePlus2} title="Nothing shared yet" message="Add a deliverable when you have something for the client to review." className="py-6" />
            ) : (
              <ul className="space-y-4">
                {deliverables.map((d) => (
                  <li key={d.id} className="rounded-2xl border border-app-border p-4">
                    <DeliverablePreview deliverable={d} />
                    {manage && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" icon={RefreshCcw} onClick={() => { setDErrors({}); openDeliverable(d, true); }}>
                          Share new version
                        </Button>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setDErrors({}); openDeliverable(d); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" icon={Trash2} className="text-status-danger" onClick={() => deleteDeliverable(d)}>
                          Delete
                        </Button>
                      </div>
                    )}
                    <DecisionHistory decisions={d.decisions} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Conversation" description="Messages go to the client by email and appear in their portal. Internal notes are only visible to staff.">
            {project.awaitingStaffReply && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl bg-gold-500/15 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">The client is waiting for a reply.</span>
                {manage && (
                  <Button size="sm" variant="ghost" icon={CheckCheck} loading={markReplied.isPending} onClick={() => markReplied.mutateAsync().then(() => toast.success('Marked as handled')).catch((e) => toast.error(e.message))}>
                    Mark as handled
                  </Button>
                )}
              </div>
            )}
            <MessageThread messages={messages} viewer="staff" onSend={sendMessage} sending={send.isPending} canPost={manage} emptyText="No messages yet. Say hello to the client!" />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Details">
            <dl className="divide-y divide-app-border">
              <Detail label="Status">
                <ProjectStatusBadge status={project.status} />
              </Detail>
              <Detail label="Stage">{project.stageLabel}</Detail>
              <Detail label="Start">{project.startDate && formatDate(project.startDate)}</Detail>
              <Detail label="Target delivery">{project.dueDate && formatDate(project.dueDate)}</Detail>
              <Detail label="Manager">{project.manager?.name}</Detail>
              <Detail label="Client portal">{project.visibleToClient ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}</Detail>
              <Detail label="Created">{formatDate(project.createdAt)}</Detail>
            </dl>
          </Card>

          <Card title="Client">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <UserRound className="h-4 w-4 text-app-subtle" aria-hidden /> {project.client?.name}
              </p>
              {project.client?.organization && <p className="text-app-subtle">{project.client.organization}</p>}
              {project.client?.email && (
                <a href={`mailto:${project.client.email}`} className="flex items-center gap-2 text-app-subtle hover:text-app-text">
                  <Mail className="h-4 w-4" aria-hidden /> <span className="truncate">{project.client.email}</span>
                </a>
              )}
              {project.client?.status && project.client.status !== 'active' && (
                <p className="rounded-lg bg-status-warning/15 px-3 py-2 text-xs text-status-warning">
                  {project.client.status === 'invited' ? 'This client hasn’t set up their portal account yet — they’ll still get emails.' : 'This client account is deactivated.'}
                </p>
              )}
              <Link to={`/admin/projects?clientId=${project.client?.id}`} className="inline-block pt-1 text-xs font-semibold text-app-text hover:underline">
                All projects for this client →
              </Link>
            </div>
          </Card>

        {can(P.INVOICES_VIEW) && <ProjectInvoices project={project} />}

          {project.summary && (
            <Card title="Summary">
              <p className="whitespace-pre-line text-sm text-app-subtle">{project.summary}</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit project"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={saveProject}>
              Save changes
            </Button>
          </>
        }
      >
        {editing && <ProjectForm value={editing} onChange={setEditing} errors={errors} />}
      </Modal>

      <Modal
        open={Boolean(deliverable)}
        onClose={() => setDeliverable(null)}
        title={deliverable?.newVersion ? `New version of “${deliverable.title}”` : deliverable?.id ? 'Edit deliverable' : 'Add a deliverable'}
        description={
          deliverable?.newVersion
            ? 'Paste the link to the updated cut. The client will be asked to review it again.'
            : deliverable?.id
              ? 'Small fixes only — this doesn’t ask the client to review again.'
              : 'The client gets an email asking them to review it.'
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeliverable(null)}>
              Cancel
            </Button>
            <Button loading={saveDeliverable.isPending} onClick={submitDeliverable}>
              {deliverable?.newVersion ? 'Share new version' : deliverable?.id ? 'Save' : 'Share with client'}
            </Button>
          </>
        }
      >
        {deliverable && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Title" required value={deliverable.title} onChange={(e) => setDeliverable((d) => ({ ...d, title: e.target.value }))} error={dErrors.title} maxLength={160} className="sm:col-span-2" placeholder="e.g. Rough cut, Final script, Poster options" />
            <Input
              label="Link"
              value={deliverable.link}
              onChange={(e) => setDeliverable((d) => ({ ...d, link: e.target.value }))}
              error={dErrors.link}
              placeholder="https://vimeo.com/…"
              hint="Use a private/unlisted link. Make sure the client can open it."
              className="sm:col-span-2"
            />
            <Textarea label="Notes for the client" rows={3} value={deliverable.description} onChange={(e) => setDeliverable((d) => ({ ...d, description: e.target.value }))} maxLength={2000} className="sm:col-span-2" placeholder="What changed, what to look out for, password for the link…" />
            <Input label="Review by (optional)" type="date" value={deliverable.dueDate} onChange={(e) => setDeliverable((d) => ({ ...d, dueDate: e.target.value }))} />
            <ImageField label="Preview image (optional)" value={deliverable.previewImage} onChange={(previewImage) => setDeliverable((d) => ({ ...d, previewImage }))} folder="projects" withAlt={false} className="sm:col-span-2" />
          </div>
        )}
      </Modal>
    </>
  );
}