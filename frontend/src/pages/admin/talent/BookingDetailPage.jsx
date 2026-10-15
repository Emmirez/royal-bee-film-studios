import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCheck, CircleCheckBig, Mail, Pencil, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { Card, ErrorState, PageHeader, PageLoader } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminMutation } from '../../../features/admin/adminApi';
import BookingModal, { bookingToForm } from '../../../features/talent/BookingModal';
import { MessageThread } from '../../../features/projects/projectUi';
import { BookingStatusBadge, DocumentList, DocumentUploader, bookingDates, feeText } from '../../../features/talent/talentUi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { imageUrl } from '../../../lib/images';
import { P } from '../../../lib/permissions';
import { formatDateTime } from '../../../lib/format';

const NOTIFY = { invalidate: [['admin', 'notifications']] };

/** Staff: one booking — details, status, conversation and documents. */
export default function BookingDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const manage = can(P.TALENT_MANAGE);
  const { data, isLoading, error, refetch } = useAdminItem('/bookings', id);
  const [editing, setEditing] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const act = useAdminMutation('/bookings', ({ path, body, method = 'post' }) => api[method](`/bookings/${id}${path}`, body).then((r) => r?.data), NOTIFY);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { booking: b, messages = [], documents = [] } = data;
  const open = ['offered', 'confirmed'].includes(b.status);

  const run = async (fn, success) => {
    try {
      const res = await fn();
      if (success) toast.success(success);
      return res;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const send = async (body) => {
    const res = await run(() => act.mutateAsync({ path: '/messages', body }), body.internal ? null : 'Sent — the talent has been emailed');
    return res !== null;
  };

  return (
    <>
      <Link to="/admin/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Bookings
      </Link>
      <PageHeader
        eyebrow={b.reference}
        title={b.role}
        description={`${b.talent?.displayName} · ${bookingDates(b)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            {manage && b.status === 'confirmed' && (
              <Button variant="secondary" icon={CircleCheckBig} onClick={async () => { if (await confirm({ title: 'Mark this job as completed?', confirmLabel: 'Mark completed' })) run(() => act.mutateAsync({ path: '/complete' }), 'Marked as completed'); }}>
                Completed
              </Button>
            )}
            {manage && open && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => setEditing(bookingToForm(b))}>
                  Edit
                </Button>
                <Button variant="ghost" icon={Ban} className="text-status-danger" onClick={() => { setReason(''); setCancelOpen(true); }}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      {b.status === 'offered' && <p className="mb-5 rounded-2xl bg-gold-500/15 px-4 py-3 text-sm">Waiting for {b.talent?.firstName} to confirm or decline in their portal.</p>}
      {b.status === 'declined' && <p className="mb-5 rounded-2xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">Declined by the talent {formatDateTime(b.respondedAt)}{b.declineReason ? ` — “${b.declineReason}”` : ''}</p>}
      {b.status === 'cancelled' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">Cancelled — {b.cancelReason}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Conversation" description="Messages are emailed to the talent and appear in their portal. Internal notes stay with staff.">
            {b.awaitingStaffReply && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl bg-gold-500/15 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">The talent is waiting for a reply.</span>
                {manage && (
                  <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => run(() => act.mutateAsync({ path: '/mark-replied' }), 'Marked as handled')}>
                    Mark as handled
                  </Button>
                )}
              </div>
            )}
            <MessageThread messages={messages} viewer="staff" audience="talent" onSend={send} sending={act.isPending} canPost={manage} emptyText="No messages yet." />
          </Card>

          <Card title="Documents for this booking" description="Contracts and release forms — private to the studio and this talent.">
            <DocumentList documents={documents} downloadPath={(d) => `/talent/${b.talent?.id}/documents/${d.id}/download`} />
            {manage && b.talent?.id && (
              <div className="mt-4">
                <DocumentUploader path={`/talent/${b.talent.id}/documents`} fixedBookingId={b.id} onUploaded={() => qc.invalidateQueries({ queryKey: ['admin', '/bookings'] })} />
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Talent">
            <Link to={`/admin/talent/${b.talent?.id}`} className="flex items-center gap-3 hover:opacity-80">
              <span className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-app-muted">
                {b.talent?.photo?.url ? <img src={imageUrl(b.talent.photo, 150)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-5 h-5 w-5 text-app-subtle" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{b.talent?.displayName}</span>
                <span className="block truncate text-xs text-app-subtle">{b.talent?.talentTypeLabels?.join(' · ')}</span>
              </span>
            </Link>
            {b.talent?.email && (
              <a href={`mailto:${b.talent.email}`} className="mt-3 flex items-center gap-2 text-sm text-app-subtle hover:text-app-text">
                <Mail className="h-4 w-4" aria-hidden /> <span className="truncate">{b.talent.email}</span>
              </a>
            )}
          </Card>
          <Card title="Details">
            <dl className="space-y-2 text-sm">
              {[
                ['Dates', bookingDates(b)],
                ['Call time', b.callTime],
                ['Location', b.location],
                ['Fee', feeText(b.fee)],
                ['Project', b.project?.title],
                ['From casting', b.casting?.title],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-app-subtle">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
            {b.details && <p className="mt-4 whitespace-pre-line border-t border-app-border pt-4 text-sm">{b.details}</p>}
          </Card>
        </div>
      </div>

      <BookingModal open={Boolean(editing)} onClose={() => setEditing(null)} initial={editing} />
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        description="The talent is emailed with your reason."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              loading={act.isPending}
              disabled={reason.trim().length < 3}
              onClick={async () => {
                const res = await run(() => act.mutateAsync({ path: '/cancel', body: { reason } }), 'Booking cancelled');
                if (res) setCancelOpen(false);
              }}
            >
              Cancel booking
            </Button>
          </>
        }
      >
        <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="e.g. The shoot has been postponed" />
      </Modal>
    </>
  );
}