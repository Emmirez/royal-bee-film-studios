import { Badge } from '../../components/ui/Primitives';
import { api } from '../../lib/api';
import { cx } from '../../lib/format';

export const CURRENCIES = [
  { value: 'NGN', label: 'NGN — Naira (₦)' },
  { value: 'USD', label: 'USD — US dollar ($)' },
  { value: 'GBP', label: 'GBP — British pound (£)' },
];
const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£' };

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'pos', label: 'POS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m;

/** ₦150,000.00 */
export function money(amount, currency = 'NGN') {
  const n = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${SYMBOLS[currency] || `${currency} `}${n}`;
}

/** Invoice dates are calendar dates (stored as UTC midnight) — format in UTC so they never shift a day. */
export function day(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const addDaysInput = (dateInput, days) => {
  const d = new Date(`${dateInput}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Same maths as the server (the server always recalculates). */
export function computeTotals({ items = [], discountType = 'none', discountValue = 0, vatEnabled = false, vatRate = 0 }) {
  const lines = items.map((i) => r2(Number(i.quantity || 0) * Number(i.unitPrice || 0)));
  const subtotal = r2(lines.reduce((s, a) => s + a, 0));
  let discountAmount = 0;
  if (discountType === 'amount') discountAmount = Math.min(subtotal, r2(discountValue));
  if (discountType === 'percent') discountAmount = r2((subtotal * Math.min(100, Number(discountValue) || 0)) / 100);
  const taxable = r2(subtotal - discountAmount);
  const vatAmount = vatEnabled ? r2((taxable * (Number(vatRate) || 0)) / 100) : 0;
  return { lines, subtotal, discountAmount, vatAmount, total: r2(taxable + vatAmount) };
}

const STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Unpaid', tone: 'info' },
  part_paid: { label: 'Part-paid', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  void: { label: 'Cancelled', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  converted: { label: 'Invoiced', tone: 'info' },
  expired: { label: 'Expired', tone: 'neutral' },
};
const QUOTE_SENT = { label: 'Awaiting reply', tone: 'gold' };

export function DocStatusBadge({ doc }) {
  const s = doc.kind === 'quote' && doc.displayStatus === 'sent' ? QUOTE_SENT : STATUS[doc.displayStatus] || STATUS.draft;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/** Download a PDF from an authenticated endpoint. */
export async function downloadPdf(path, filename) {
  const res = await api.get(path, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * On-screen version of an invoice/quote (staff and client views).
 * business: { name, address, email, phone, taxId } — optional header details.
 */
export function DocumentPreview({ doc, business, bankAccounts = [] }) {
  const isQuote = doc.kind === 'quote';
  const m = (n) => money(n, doc.currency);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-app-border p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">{isQuote ? 'Prepared for' : 'Bill to'}</p>
          <p className="mt-2 text-lg font-semibold">{doc.client?.name}</p>
          {doc.client?.organization && <p className="text-sm text-app-subtle">{doc.client.organization}</p>}
          {doc.client?.email && <p className="text-sm text-app-subtle">{doc.client.email}</p>}
          {business && (
            <p className="mt-4 whitespace-pre-line text-xs text-app-subtle">
              From <span className="font-semibold text-app-text">{business.name}</span>
              {business.address ? `\n${business.address}` : ''}
              {business.taxId ? `\nTIN: ${business.taxId}` : ''}
            </p>
          )}
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:text-right">
          <dt className="text-app-subtle">Issue date</dt>
          <dd className="font-semibold">{day(doc.issueDate)}</dd>
          <dt className="text-app-subtle">{isQuote ? 'Valid until' : 'Due date'}</dt>
          <dd className={cx('font-semibold', doc.displayStatus === 'overdue' && 'text-status-danger')}>{day(doc.dueDate)}</dd>
          <dt className="text-app-subtle">Currency</dt>
          <dd className="font-semibold">{doc.currency}</dd>
          {doc.project && (
            <>
              <dt className="text-app-subtle">Project</dt>
              <dd className="font-semibold">{doc.project.title}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="p-6 sm:p-8">
        {doc.title && <h2 className="mb-5 font-display text-2xl font-semibold">{doc.title}</h2>}

        {/* Lines — table on wide screens, stacked on phones */}
        <div className="hidden overflow-hidden rounded-xl border border-app-border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-app-muted text-left text-xs uppercase tracking-wide text-app-subtle">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Description</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Unit price</th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {doc.items.map((i, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={idx}>
                  <td className="whitespace-pre-line px-4 py-3">{i.description}</td>
                  <td className="px-4 py-3 text-right tabular">{i.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular">{m(i.unitPrice)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular">{m(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-3 sm:hidden">
          {doc.items.map((i, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={idx} className="rounded-xl border border-app-border p-3 text-sm">
              <p className="whitespace-pre-line">{i.description}</p>
              <p className="mt-1 flex justify-between text-app-subtle">
                <span>
                  {i.quantity} × {m(i.unitPrice)}
                </span>
                <span className="font-semibold text-app-text">{m(i.amount)}</span>
              </p>
            </li>
          ))}
        </ul>

        <dl className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-app-subtle">Subtotal</dt>
            <dd className="tabular">{m(doc.subtotal)}</dd>
          </div>
          {doc.discountAmount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-app-subtle">Discount{doc.discountType === 'percent' ? ` (${doc.discountValue}%)` : ''}</dt>
              <dd className="tabular">− {m(doc.discountAmount)}</dd>
            </div>
          )}
          {doc.vatEnabled && (
            <div className="flex justify-between gap-4">
              <dt className="text-app-subtle">VAT ({doc.vatRate}%)</dt>
              <dd className="tabular">{m(doc.vatAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 rounded-xl bg-app-text px-4 py-3 text-base font-semibold text-app-bg">
            <dt>Total</dt>
            <dd className="tabular">{m(doc.total)}</dd>
          </div>
          {!isQuote && doc.amountPaid > 0 && (
            <>
              <div className="flex justify-between gap-4 pt-1">
                <dt className="text-app-subtle">Paid</dt>
                <dd className="tabular">− {m(doc.amountPaid)}</dd>
              </div>
              <div className="flex justify-between gap-4 font-semibold">
                <dt>Balance due</dt>
                <dd className="tabular">{m(doc.balance)}</dd>
              </div>
            </>
          )}
        </dl>

        {bankAccounts.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">How to pay</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {bankAccounts.map((b, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx} className="rounded-xl bg-gold-500/10 p-4 text-sm">
                  <p className="font-semibold">
                    {b.bankName} <span className="text-xs font-normal text-app-subtle">({b.currency})</span>
                  </p>
                  <p className="text-app-subtle">{b.accountName}</p>
                  <p className="mt-1 font-mono text-base font-semibold tracking-wide">{b.accountNumber}</p>
                  {b.extra && <p className="mt-1 text-xs text-app-subtle">{b.extra}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-app-subtle">
              Please use <span className="font-semibold text-app-text">{doc.reference}</span> as your payment reference.
            </p>
          </div>
        )}

        {doc.notes && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">Notes</p>
            <p className="mt-2 whitespace-pre-line text-sm">{doc.notes}</p>
          </div>
        )}
        {doc.terms && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-subtle">Terms</p>
            <p className="mt-2 whitespace-pre-line text-sm text-app-subtle">{doc.terms}</p>
          </div>
        )}
      </div>
    </div>
  );
}