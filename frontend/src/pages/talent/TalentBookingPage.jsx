import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { MessageThread } from '../../features/projects/projectUi';
import { BookingStatusBadge, DocumentList, DocumentUploader, bookingDates, feeText } from '../../features/talent/talentUi';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiRequestError } from '../../lib/api';

/** Talent: one booking — confirm/decline, details, messages and documents. */
export default function TalentBookingPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const key = ['talent', 'booking', id];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/talent-portal/bookings/${id}`)).data, refetchOnWindowFocus: true });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ['talent', 'bookings'] }), qc.invalidateQueries({ queryKey: ['talent', 'overview'] })]);
  const respond = useMutation({ mutationFn: (body) => api.post(`/talent-portal/bookings/${id}/respond`, body).then((r) => r.data), onSuccess: refresh });
  const send = useMutation({ mutationFn: (body) => api.post(`/talent-portal/bookings/${id}/messages`, { body }).then((r) => r.data), onSuccess: refresh });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { booking: b, messages = [], documents = [] } = data;
  const open = ['offered', 'confirmed'].includes(b.status);

  const accept = async () => {
    if (!(await confirm({ title: 'Confirm this booking?', message: `You’re committing to ${bookingDates(b)}${b.callTime ? `, call time ${b.callTime}` : ''}.`, confirmLabel: 'Confirm booking' }))) return;
    try {
      await respond.mutateAsync({ decision: 'confirmed' });
      toast.success('Booking confirmed — see you on set!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const decline = async () => {
    setReasonError('');
    if (reason.trim().length < 3) {
      setReasonError('Let the studio know why (a few words is fine)');
      return;
    }
    try {
      await respond.mutateAsync({ decision: 'declined', reason: reason.trim() });
      toast.success('Thanks for letting us know.');
      setDeclineOpen(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors?.reason) setReasonError(err.fieldErrors.reason);
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
      <Seo title={b.role} noIndex />
      <Link to="/talent/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Bookings
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-app-subtle">{b.reference}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-5xl">{b.role}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-app-subtle">
            <BookingStatusBadge status={b.status} />
            <span>{bookingDates(b)}</span>
          </div>
        </div>
        {b.status === 'offered' && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button icon={CheckCircle2} loading={respond.isPending && respond.variables?.decision === 'confirmed'} onClick={accept}>
              Confirm booking
            </Button>
            <Button variant="secondary" icon={XCircle} onClick={() => { setReason(''); setReasonError(''); setDeclineOpen(true); }}>
              Decline
            </Button>
          </div>
        )}
      </div>

      {b.status === 'cancelled' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">This booking was cancelled by the studio{b.cancelReason ? ` — ${b.cancelReason}` : ''}.</p>}
      {b.status === 'declined' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">You declined this booking.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Messages" description="Questions about this job? The team gets your message straight away.">
            <MessageThread messages={messages} viewer="client" audience="talent" onSend={sendMessage} sending={send.isPending} canPost={open || b.status === 'completed'} emptyText="No messages yet." />
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          <Card title="Job details">
            <dl className="space-y-2 text-sm">
              {[
                ['Dates', bookingDates(b)],
                ['Call time', b.callTime],
                ['Location', b.location],
                ['Fee', feeText(b.fee)],
                ['Production', b.project?.title],
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
          <Card title="Documents" description="Contracts and release forms for this job.">
            <DocumentList documents={documents} downloadPath={(d) => `/talent-portal/documents/${d.id}/download`} emptyText="Nothing shared yet." />
            {open && (
              <div className="mt-4">
                <DocumentUploader path="/talent-portal/documents" fixedBookingId={b.id} onUploaded={refresh} />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Decline this booking?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button loading={respond.isPending} onClick={decline}>
              Decline booking
            </Button>
          </>
        }
      >
        <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} maxLength={1000} placeholder="e.g. I’m already booked on those dates" />
      </Modal>
    </>
  );
}