import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { Card, EmptyState, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { DecisionHistory, DeliverablePreview, MessageThread, ProjectStatusBadge, StageTimeline } from '../../features/projects/projectUi';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiRequestError } from '../../lib/api';
import { formatDate } from '../../lib/format';

/** Client portal: one project — progress, things to review and the conversation with the studio. */
export default function PortalProjectPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [changes, setChanges] = useState(null); // deliverable being sent back
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  const key = ['portal', 'project', id];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/portal/projects/${id}`)).data, refetchOnWindowFocus: true });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ['portal', 'projects'] })]);

  const send = useMutation({ mutationFn: (body) => api.post(`/portal/projects/${id}/messages`, { body }).then((r) => r.data), onSuccess: refresh });
  const decide = useMutation({
    mutationFn: ({ did, ...body }) => api.post(`/portal/projects/${id}/deliverables/${did}/decision`, body).then((r) => r.data),
    onSuccess: refresh,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { project, deliverables = [], messages = [] } = data;
  const toReview = deliverables.filter((d) => d.status === 'awaiting_review');
  const others = deliverables.filter((d) => d.status !== 'awaiting_review');

  const approve = async (d) => {
    const ok = await confirm({ title: `Approve “${d.title}”?`, message: `This tells the studio version ${d.version} is good to go.`, confirmLabel: 'Approve' });
    if (!ok) return;
    try {
      await decide.mutateAsync({ did: d.id, decision: 'approved' });
      toast.success('Approved — thank you! The studio has been notified.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sendChanges = async () => {
    setCommentError('');
    if (comment.trim().length < 5) {
      setCommentError('Tell the studio what you’d like changed');
      return;
    }
    try {
      await decide.mutateAsync({ did: changes.id, decision: 'changes_requested', comment: comment.trim() });
      toast.success('Sent — the studio will share an updated version.');
      setChanges(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors?.comment) setCommentError(err.fieldErrors.comment);
      toast.error(err.message);
    }
  };

  const sendMessage = async ({ body }) => {
    try {
      await send.mutateAsync(body);
      toast.success('Message sent to the studio');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  return (
    <>
      <Seo title={project.title} noIndex />
      <Link to="/portal" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My projects
      </Link>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-app-subtle">{project.reference}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-5xl">{project.title}</h1>
          <p className="mt-2 text-sm text-app-subtle">
            {[project.serviceTitle, project.manager?.name && `Your contact: ${project.manager.name}`, project.dueDate && `Target delivery: ${formatDate(project.dueDate)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <Card title="Where we are" className="mb-6">
        <StageTimeline stage={project.stage} history={project.stageHistory} />
        {project.summary && <p className="mt-6 whitespace-pre-line border-t border-app-border pt-5 text-sm text-app-subtle">{project.summary}</p>}
      </Card>

      {toReview.length > 0 && (
        <Card title="Ready for your review" description="Open the link, then approve it or tell us what to change." className="mb-6 border-gold-500/40">
          <ul className="space-y-4">
            {toReview.map((d) => (
              <li key={d.id} className="rounded-2xl border border-app-border p-4">
                <DeliverablePreview deliverable={d} />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button icon={CheckCircle2} loading={decide.isPending && decide.variables?.did === d.id && decide.variables?.decision === 'approved'} onClick={() => approve(d)}>
                    Approve
                  </Button>
                  <Button variant="secondary" icon={MessageSquareWarning} onClick={() => { setComment(''); setCommentError(''); setChanges(d); }}>
                    Request changes
                  </Button>
                </div>
                <DecisionHistory decisions={d.decisions} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card title="Messages" description="Questions or feedback? The team gets your message straight away." className="min-w-0">
          <MessageThread messages={messages} viewer="client" onSend={sendMessage} sending={send.isPending} emptyText="No messages yet. Say hello to the team!" />
        </Card>

        <Card title="Shared with you" className="min-w-0">
          {others.length === 0 ? (
            <EmptyState title={toReview.length ? 'Nothing else yet' : 'Nothing shared yet'} message="Cuts, scripts and stills will appear here as the studio shares them." className="py-6" />
          ) : (
            <ul className="space-y-4">
              {others.map((d) => (
                <li key={d.id} className="rounded-2xl border border-app-border p-4">
                  <DeliverablePreview deliverable={d} />
                  {d.status === 'changes_requested' && <p className="mt-2 text-xs text-app-subtle">The studio is working on your changes — you’ll get an email when the new version is ready.</p>}
                  <DecisionHistory decisions={d.decisions} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(changes)}
        onClose={() => setChanges(null)}
        title={`Request changes to “${changes?.title || ''}”`}
        description="Be as specific as you can — timestamps (e.g. 0:42) help a lot."
        footer={
          <>
            <Button variant="ghost" onClick={() => setChanges(null)}>
              Cancel
            </Button>
            <Button loading={decide.isPending} onClick={sendChanges}>
              Send to the studio
            </Button>
          </>
        }
      >
        <Textarea label="What would you like changed?" required rows={6} value={comment} onChange={(e) => setComment(e.target.value)} error={commentError} maxLength={3000} />
      </Modal>
    </>
  );
}