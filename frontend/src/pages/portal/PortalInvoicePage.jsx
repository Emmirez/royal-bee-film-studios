import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Download, XCircle } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { DocStatusBadge, DocumentPreview, day, downloadPdf, methodLabel, money } from '../../features/invoices/invoiceUi';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiRequestError } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

/** Client portal: one invoice or quote. */
export default function PortalInvoicePage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [downloading, setDownloading] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  const key = ['portal', 'invoice', id];
  const { data: doc, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/portal/invoices/${id}`)).data });
  const decide = useMutation({
    mutationFn: (body) => api.post(`/portal/invoices/${id}/decision`, body).then((r) => r.data),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ['portal', 'invoices'] })]),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const isQuote = doc.kind === 'quote';
  const canAnswer = isQuote && doc.displayStatus === 'sent';

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPdf(`/portal/invoices/${id}/pdf`, `${doc.reference}.pdf`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const accept = async () => {
    const ok = await confirm({ title: `Accept quote ${doc.reference}?`, message: `This tells the studio you’re happy to go ahead at ${money(doc.total, doc.currency)}. They’ll follow up with an invoice.`, confirmLabel: 'Accept quote' });
    if (!ok) return;
    try {
      await decide.mutateAsync({ decision: 'accepted' });
      toast.success('Quote accepted — thank you! The studio has been notified.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const decline = async () => {
    setCommentError('');
    if (comment.trim().length < 3) {
      setCommentError('Let the studio know why (a few words is fine)');
      return;
    }
    try {
      await decide.mutateAsync({ decision: 'declined', comment: comment.trim() });
      toast.success('Thanks — the studio has been told.');
      setDeclineOpen(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors?.comment) setCommentError(err.fieldErrors.comment);
      toast.error(err.message);
    }
  };

  return (
    <>
      <Seo title={doc.reference} noIndex />
      <Link to="/portal/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Invoices & quotes
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">{isQuote ? 'Quote' : 'Invoice'}</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold sm:text-3xl">{doc.reference}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-app-subtle">
            <DocStatusBadge doc={doc} />
            <span className="font-semibold text-app-text tabular">{money(isQuote || doc.balance === 0 ? doc.total : doc.balance, doc.currency)}</span>
            <span>{isQuote ? `Valid until ${day(doc.dueDate)}` : doc.balance > 0 ? `due by ${day(doc.dueDate)}` : ''}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canAnswer && (
            <>
              <Button icon={CheckCircle2} loading={decide.isPending && decide.variables?.decision === 'accepted'} onClick={accept}>
                Accept quote
              </Button>
              <Button variant="secondary" icon={XCircle} onClick={() => { setComment(''); setCommentError(''); setDeclineOpen(true); }}>
                Decline
              </Button>
            </>
          )}
          <Button variant="secondary" icon={Download} loading={downloading} onClick={download}>
            Download PDF
          </Button>
        </div>
      </div>

      {doc.status === 'void' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">This {isQuote ? 'quote' : 'invoice'} was cancelled{doc.voidReason ? ` — ${doc.voidReason}` : ''}. Nothing is owed on it.</p>}
      {doc.displayStatus === 'expired' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">This quote has expired. Message the studio from your project and they’ll send an updated one.</p>}
      {doc.decision && (
        <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          You {doc.status === 'declined' ? 'declined' : 'accepted'} this quote on {formatDateTime(doc.decision.at)}.{doc.status === 'converted' ? ' The studio has issued an invoice for it.' : ''}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <DocumentPreview doc={doc} business={doc.business} bankAccounts={doc.bankAccounts} />
        </div>
        {!isQuote && (
          <div className="min-w-0">
            <Card title="Payments received">
              {doc.payments.length === 0 ? (
                <p className="text-sm text-app-subtle">None yet. Once the studio confirms your transfer, it shows here and you’ll get a receipt by email.</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {doc.payments.map((p) => (
                    <li key={p.id} className="py-3 text-sm">
                      <p className="font-semibold tabular">{money(p.amount, doc.currency)}</p>
                      <p className="text-xs text-app-subtle">
                        {day(p.date)} · {methodLabel(p.method)}
                      </p>
                      <p className="text-xs text-app-subtle">Receipt {p.receiptNumber}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Decline this quote?"
        description="Tell the studio why — they may be able to send a revised quote."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button loading={decide.isPending} onClick={decline}>
              Send
            </Button>
          </>
        }
      >
        <Textarea label="Your reason" required rows={4} value={comment} onChange={(e) => setComment(e.target.value)} error={commentError} maxLength={2000} />
      </Modal>
    </>
  );
}