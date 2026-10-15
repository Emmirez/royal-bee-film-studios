import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Download, FileOutput, HandCoins, MoreHorizontal, Pencil, Send, Trash2, XCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { Card, ErrorState, PageHeader, PageLoader, Switch } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminMutation } from '../../../features/admin/adminApi';
import { DocStatusBadge, DocumentPreview, PAYMENT_METHODS, day, downloadPdf, methodLabel, money, todayInput } from '../../../features/invoices/invoiceUi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDateTime } from '../../../lib/format';

const NOTIFY = { invalidate: [['admin', 'notifications']] };

/** Staff: one invoice or quote — send, record payments, convert, cancel, download. */
export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const manage = can(P.INVOICES_MANAGE);
  const { data: doc, isLoading, error, refetch } = useAdminItem('/invoices', id);

  const [sendOpen, setSendOpen] = useState(false);
  const [emailClient, setEmailClient] = useState(true);
  const [payment, setPayment] = useState(null);
  const [payErrors, setPayErrors] = useState({});
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [menu, setMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const act = useAdminMutation('/invoices', ({ path, body, method = 'post' }) => api[method](`/invoices/${id}${path}`, body).then((r) => r?.data), NOTIFY);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const isQuote = doc.kind === 'quote';
  const word = isQuote ? 'quote' : 'invoice';
  const s = doc.status;
  const canEdit = manage && (isQuote ? ['draft', 'sent'].includes(s) : ['draft', 'sent'].includes(s) && !doc.payments.length);
  const canSend = manage && (isQuote ? ['draft', 'sent'].includes(s) : ['draft', 'sent', 'part_paid'].includes(s));
  const canPay = manage && !isQuote && ['sent', 'part_paid'].includes(s);
  const canVoid = manage && !['void', 'converted'].includes(s) && !doc.payments.length && s !== 'draft';
  const canConvert = manage && isQuote && ['sent', 'accepted'].includes(s);
  const canDecide = manage && isQuote && s === 'sent';

  const run = async (fn, success) => {
    try {
      const res = await fn();
      if (success) toast.success(typeof success === 'function' ? success(res) : success);
      return res;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const send = async () => {
    const res = await run(() => act.mutateAsync({ path: '/send', body: { email: emailClient } }), (r) => (r.emailed ? `Sent — ${doc.client?.name} has been emailed` : `Marked as sent — it’s now in ${doc.client?.name}’s portal`));
    if (res) setSendOpen(false);
  };

  const savePayment = async () => {
    setPayErrors({});
    try {
      await act.mutateAsync({ path: '/payments', body: { ...payment, amount: Number(payment.amount) } });
      toast.success(payment.sendReceipt ? 'Payment recorded — receipt emailed' : 'Payment recorded');
      setPayment(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setPayErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  const removePayment = async (p) => {
    const ok = await confirm({ title: `Remove payment ${p.receiptNumber}?`, message: `${money(p.amount, doc.currency)} will be taken off this invoice. Use this to fix a mistake.`, tone: 'danger', confirmLabel: 'Remove payment' });
    if (ok) await run(() => act.mutateAsync({ path: `/payments/${p.id}`, method: 'del' }), 'Payment removed');
  };

  const voidDoc = async () => {
    const res = await run(() => act.mutateAsync({ path: '/void', body: { reason: voidReason } }), `${isQuote ? 'Quote' : 'Invoice'} cancelled`);
    if (res) setVoidOpen(false);
  };

  const remove = async () => {
    setMenu(false);
    const ok = await confirm({ title: `Delete this draft ${word}?`, message: 'It has never been sent, so it’s removed completely.', tone: 'danger', confirmLabel: 'Delete draft' });
    if (!ok) return;
    const res = await run(() => act.mutateAsync({ path: '', method: 'del' }), 'Draft deleted');
    if (res !== null) navigate('/admin/invoices', { replace: true });
  };

  const convert = async () => {
    const ok = await confirm({ title: 'Turn this quote into an invoice?', message: 'A draft invoice is created with the same lines. You can check it before sending.', confirmLabel: 'Create invoice' });
    if (!ok) return;
    const inv = await run(() => act.mutateAsync({ path: '/convert' }), 'Draft invoice created');
    if (inv) navigate(`/admin/invoices/${inv.id}`);
  };

  const accept = async () => {
    const ok = await confirm({ title: 'Mark as accepted?', message: 'Use this when the client accepted by phone, email or in person.', confirmLabel: 'Mark accepted' });
    if (ok) await run(() => act.mutateAsync({ path: '/decision', body: { decision: 'accepted' } }), 'Quote marked as accepted');
  };

  const decline = async () => {
    const res = await run(() => act.mutateAsync({ path: '/decision', body: { decision: 'declined', comment: declineNote } }), 'Quote marked as declined');
    if (res) setDeclineOpen(false);
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPdf(`/invoices/${id}/pdf`, `${doc.reference}.pdf`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Link to={`/admin/invoices${isQuote ? '?kind=quote' : ''}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {isQuote ? 'Quotes' : 'Invoices'}
      </Link>
      <PageHeader
        eyebrow={isQuote ? 'Quote' : 'Invoice'}
        title={doc.reference}
        description={`${doc.client?.name || ''}${doc.client?.organization ? ` · ${doc.client.organization}` : ''} · ${money(doc.total, doc.currency)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocStatusBadge doc={doc} />
            <Button variant="secondary" icon={Download} loading={downloading} onClick={download}>
              PDF
            </Button>
            {canPay && (
              <Button icon={HandCoins} onClick={() => { setPayErrors({}); setPayment({ amount: doc.balance, date: todayInput(), method: 'bank_transfer', reference: '', note: '', sendReceipt: true }); }}>
                Record payment
              </Button>
            )}
            {canConvert && (
              <Button icon={FileOutput} onClick={convert}>
                Convert to invoice
              </Button>
            )}
            {canSend && (
              <Button variant={s === 'draft' ? 'primary' : 'secondary'} icon={Send} onClick={() => { setEmailClient(true); setSendOpen(true); }}>
                {s === 'draft' ? 'Send to client' : 'Resend'}
              </Button>
            )}
            {manage && (canEdit || canVoid || s === 'draft' || canDecide) && (
              <div className="relative">
                <Button size="icon" variant="ghost" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menu && (
                  <div role="menu" className="absolute right-0 z-20 mt-1 w-56 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                    {canEdit && (
                      <Link role="menuitem" to={`/admin/invoices/${id}/edit`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-app-muted">
                        <Pencil className="h-4 w-4" aria-hidden /> Edit
                      </Link>
                    )}
                    {canDecide && (
                      <>
                        <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => { setMenu(false); accept(); }}>
                          <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark as accepted
                        </button>
                        <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => { setMenu(false); setDeclineNote(''); setDeclineOpen(true); }}>
                          <XCircle className="h-4 w-4" aria-hidden /> Mark as declined
                        </button>
                      </>
                    )}
                    {canVoid && (
                      <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={() => { setMenu(false); setVoidReason(''); setVoidOpen(true); }}>
                        <Ban className="h-4 w-4" aria-hidden /> Cancel {word}
                      </button>
                    )}
                    {s === 'draft' && (
                      <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={remove}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete draft
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {s === 'draft' && <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm text-app-subtle">This is a draft — the client can’t see it yet. Click <strong className="text-app-text">Send to client</strong> when it’s ready.</p>}
      {s === 'void' && (
        <p className="mb-5 rounded-2xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          Cancelled {day(doc.voidedAt)}
          {doc.voidReason ? ` — ${doc.voidReason}` : ''}
        </p>
      )}
      {doc.decision && (
        <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          {s === 'declined' ? 'Declined' : 'Accepted'} {formatDateTime(doc.decision.at)}
          {doc.decision.comment ? ` — “${doc.decision.comment}”` : ''}
        </p>
      )}
      {doc.convertedTo && (
        <p className="mb-5 rounded-2xl bg-status-info/10 px-4 py-3 text-sm">
          This quote was turned into an invoice.{' '}
          <Link to={`/admin/invoices/${doc.convertedTo}`} className="font-semibold underline">
            Open the invoice →
          </Link>
        </p>
      )}
      {doc.convertedFrom && (
        <p className="mb-5 text-sm text-app-subtle">
          Created from a quote.{' '}
          <Link to={`/admin/invoices/${doc.convertedFrom}`} className="font-semibold text-app-text underline">
            View the quote
          </Link>
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <DocumentPreview doc={doc} />
        </div>
        <div className="min-w-0 space-y-6">
          {!isQuote && (
            <Card title="Payments" description="Payments made off the website, recorded by the team.">
              {doc.payments.length === 0 ? (
                <p className="text-sm text-app-subtle">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {doc.payments.map((p) => (
                    <li key={p.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold tabular">{money(p.amount, doc.currency)}</p>
                          <p className="text-xs text-app-subtle">
                            {day(p.date)} · {methodLabel(p.method)}
                            {p.reference ? ` · Ref ${p.reference}` : ''}
                          </p>
                          <p className="text-xs text-app-subtle">
                            Receipt {p.receiptNumber}
                            {p.recordedBy ? ` · by ${p.recordedBy}` : ''}
                          </p>
                          {p.note && <p className="mt-1 text-xs">{p.note}</p>}
                        </div>
                        {manage && (
                          <Button size="icon-sm" variant="ghost" aria-label={`Remove payment ${p.receiptNumber}`} onClick={() => removePayment(p)}>
                            <Trash2 className="h-4 w-4 text-status-danger" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="mt-4 space-y-1 border-t border-app-border pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-app-subtle">Paid</dt>
                  <dd className="font-semibold tabular">{money(doc.amountPaid, doc.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-app-subtle">Balance due</dt>
                  <dd className="font-semibold tabular">{money(doc.balance, doc.currency)}</dd>
                </div>
              </dl>
            </Card>
          )}
          <Card title="History">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-app-subtle">Created</dt>
                <dd>{formatDateTime(doc.createdAt)}</dd>
              </div>
              {doc.sentAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-subtle">Last sent</dt>
                  <dd>{formatDateTime(doc.sentAt)}</dd>
                </div>
              )}
              {doc.paidAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-subtle">Paid in full</dt>
                  <dd>{formatDateTime(doc.paidAt)}</dd>
                </div>
              )}
            </dl>
            {doc.project && (
              <Link to={`/admin/projects/${doc.project.id}`} className="mt-4 inline-block text-sm font-semibold hover:underline">
                Open project: {doc.project.title} →
              </Link>
            )}
          </Card>
        </div>
      </div>

      {/* Send / resend */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={s === 'draft' ? `Send ${word} to ${doc.client?.name}?` : `Resend ${word}?`}
        description={`It appears in ${doc.client?.name}’s client portal, where they can download the PDF${isQuote ? ' and accept or decline it' : ''}.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button icon={Send} loading={act.isPending} onClick={send}>
              {emailClient ? 'Send' : 'Mark as sent'}
            </Button>
          </>
        }
      >
        <Switch checked={emailClient} onChange={setEmailClient} label={`Email ${doc.client?.email}`} description={isQuote ? 'Includes a link to review the quote.' : 'Includes the amount due, due date and your bank details.'} />
        {doc.client?.status === 'invited' && <p className="mt-4 rounded-xl bg-status-warning/15 px-3 py-2 text-xs text-status-warning">This client hasn’t set up their portal account yet. The email will remind them to use their invitation first.</p>}
      </Modal>

      {/* Record a payment */}
      <Modal
        open={Boolean(payment)}
        onClose={() => setPayment(null)}
        title="Record a payment"
        description={`Balance due: ${money(doc.balance, doc.currency)}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayment(null)}>
              Cancel
            </Button>
            <Button icon={HandCoins} loading={act.isPending} onClick={savePayment}>
              Record payment
            </Button>
          </>
        }
      >
        {payment && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={`Amount received (${doc.currency})`} type="number" min="0" step="0.01" inputMode="decimal" required value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} error={payErrors.amount} />
            <Input label="Date received" type="date" required value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))} error={payErrors.date} />
            <Select label="Method" value={payment.method} onChange={(v) => setPayment((p) => ({ ...p, method: v }))} options={PAYMENT_METHODS} />
            <Input label="Bank / transfer reference" value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} maxLength={120} placeholder="Optional" />
            <Textarea label="Internal note (staff only)" rows={2} value={payment.note} onChange={(e) => setPayment((p) => ({ ...p, note: e.target.value }))} maxLength={500} className="sm:col-span-2" />
            <Switch className="sm:col-span-2" checked={payment.sendReceipt} onChange={(v) => setPayment((p) => ({ ...p, sendReceipt: v }))} label="Email a receipt to the client" />
          </div>
        )}
      </Modal>

      {/* Cancel (void) */}
      <Modal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title={`Cancel this ${word}?`}
        description="The record is kept (marked Cancelled) so your numbering has no gaps. The client will see it as cancelled."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoidOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" loading={act.isPending} disabled={voidReason.trim().length < 3} onClick={voidDoc}>
              Cancel {word}
            </Button>
          </>
        }
      >
        <Textarea label="Reason" required rows={3} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} maxLength={300} placeholder="e.g. Issued in error — replaced by a new invoice" />
      </Modal>

      {/* Quote declined (recorded by staff) */}
      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Mark quote as declined?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button loading={act.isPending} disabled={declineNote.trim().length < 3} onClick={decline}>
              Mark declined
            </Button>
          </>
        }
      >
        <Textarea label="What did the client say?" required rows={3} value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} maxLength={2000} />
      </Modal>
    </>
  );
}