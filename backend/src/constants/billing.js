/** Invoices & quotes (Stage 4B). Payments happen off the website — these are records only. */
export const CURRENCIES = ['NGN', 'USD', 'GBP'];
export const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', GBP: '£' };

export const DOCUMENT_KINDS = ['invoice', 'quote'];

/** Stored statuses. "overdue" (invoices) and "expired" (quotes) are worked out from the dates. */
export const INVOICE_STATUSES = ['draft', 'sent', 'part_paid', 'paid', 'void'];
export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'converted', 'void'];

export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'card', 'pos', 'cheque', 'other'];
export const DISCOUNT_TYPES = ['none', 'amount', 'percent'];

/** Round to 2 decimal places (avoids floating-point pennies). */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Work out every total from the line items. The server always recalculates —
 * totals sent by the browser are never trusted.
 */
export function computeTotals({ items = [], discountType = 'none', discountValue = 0, vatEnabled = false, vatRate = 0, amountPaid = 0 }) {
  const lines = items.map((i) => ({ ...i, amount: round2(Number(i.quantity || 0) * Number(i.unitPrice || 0)) }));
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  let discountAmount = 0;
  if (discountType === 'amount') discountAmount = Math.min(subtotal, round2(discountValue));
  if (discountType === 'percent') discountAmount = round2((subtotal * Math.min(100, Number(discountValue) || 0)) / 100);
  const taxable = round2(subtotal - discountAmount);
  const vatAmount = vatEnabled ? round2((taxable * (Number(vatRate) || 0)) / 100) : 0;
  const total = round2(taxable + vatAmount);
  const paid = round2(amountPaid);
  return { lines, subtotal, discountAmount, vatAmount, total, amountPaid: paid, balance: round2(Math.max(0, total - paid)) };
}