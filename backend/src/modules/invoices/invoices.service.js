import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { User } from '../../models/User.js';
import { BillingSettings } from '../../models/BillingSettings.js';
import { CURRENCY_SYMBOLS, computeTotals } from '../../constants/billing.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { site } from '../projects/projects.service.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(here, '../../../public/email/logo.png');

export const portalInvoiceLink = (doc) => `${site()}/portal/invoices/${doc._id}`;
export const adminInvoiceLink = (doc) => `${site()}/admin/invoices/${doc._id}`;

const personName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Money as text, e.g. "NGN 150,000.00", "$1,200.00". (₦ isn't in the PDF's built-in font, so NGN is spelled out.) */
export function money(amount, currency = 'NGN', { forPdf = false } = {}) {
  const n = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === 'NGN') return forPdf ? `NGN ${n}` : `₦${n}`;
  return `${CURRENCY_SYMBOLS[currency] || `${currency} `}${n}`;
}

/** Invoice dates are calendar dates stored as UTC midnight, so format them in UTC (no day shift on servers in other time zones). */
export const dateText = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');

/** "overdue" (invoices) and "expired" (quotes) are worked out from the due date. */
export function displayStatus(doc) {
  const past = doc.dueDate && new Date(doc.dueDate) < startOfToday();
  if (doc.kind === 'invoice' && ['sent', 'part_paid'].includes(doc.status) && past) return 'overdue';
  if (doc.kind === 'quote' && doc.status === 'sent' && past) return 'expired';
  return doc.status;
}

/** Recalculate totals and (for invoices that have been sent) the payment status. */
export function applyTotals(doc) {
  const amountPaid = (doc.payments || []).reduce((s, p) => s + p.amount, 0);
  const t = computeTotals({ ...doc.toObject(), amountPaid });
  doc.items = t.lines;
  Object.assign(doc, { subtotal: t.subtotal, discountAmount: t.discountAmount, vatAmount: t.vatAmount, total: t.total, amountPaid: t.amountPaid, balance: t.balance });
  if (doc.kind === 'invoice' && !['draft', 'void'].includes(doc.status)) {
    if (t.total > 0 && t.amountPaid >= t.total) {
      doc.status = 'paid';
      doc.paidAt = doc.paidAt || new Date();
    } else {
      doc.status = t.amountPaid > 0 ? 'part_paid' : 'sent';
      doc.paidAt = null;
    }
  }
  return doc;
}

export function invoiceOut(doc, { forClient = false } = {}) {
  const client = doc.client && doc.client.firstName ? doc.client : null;
  const project = doc.project && doc.project.title ? doc.project : null;
  return {
    id: doc._id,
    kind: doc.kind,
    reference: doc.reference,
    status: doc.status,
    displayStatus: displayStatus(doc),
    client: client
      ? { id: client._id, name: personName(client), email: client.email, organization: client.organization, status: forClient ? undefined : client.status }
      : forClient
        ? undefined
        : doc.client,
    project: project ? { id: project._id, title: project.title, reference: project.reference } : null,
    title: doc.title,
    currency: doc.currency,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    items: (doc.items || []).map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount })),
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    vatEnabled: doc.vatEnabled,
    vatRate: doc.vatRate,
    subtotal: doc.subtotal,
    discountAmount: doc.discountAmount,
    vatAmount: doc.vatAmount,
    total: doc.total,
    amountPaid: doc.amountPaid,
    balance: doc.balance,
    notes: doc.notes,
    terms: doc.terms,
    payments: (doc.payments || []).map((p) => ({
      id: p._id,
      receiptNumber: p.receiptNumber,
      amount: p.amount,
      date: p.date,
      method: p.method,
      reference: p.reference,
      note: forClient ? undefined : p.note,
      recordedBy: !forClient && p.recordedBy?.firstName ? personName(p.recordedBy) : undefined,
    })),
    sentAt: doc.sentAt,
    paidAt: doc.paidAt,
    voidedAt: doc.voidedAt,
    voidReason: doc.voidReason,
    decision: doc.decision?.at ? { at: doc.decision.at, comment: doc.decision.comment } : null,
    convertedTo: doc.convertedTo,
    convertedFrom: doc.convertedFrom,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Bank accounts to show for a currency (falls back to all accounts). */
export function banksFor(settings, currency) {
  const all = (settings.bankAccounts || []).filter((b) => b.bankName || b.accountNumber);
  const match = all.filter((b) => b.currency === currency);
  return match.length ? match : all;
}

/* ───────── Emails to the client ───────── */

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function bankHtml(settings, currency) {
  const banks = banksFor(settings, currency);
  if (!banks.length) return '';
  return banks
    .map(
      (b) =>
        `<div style="margin:0 0 10px;padding:12px 14px;background:#f6f1e7;border-radius:10px;font-size:14px;line-height:1.6"><strong>${esc(b.bankName)}</strong> (${esc(b.currency)})<br>Account name: ${esc(b.accountName)}<br>Account number: <strong>${esc(b.accountNumber)}</strong>${b.extra ? `<br>${esc(b.extra)}` : ''}</div>`,
    )
    .join('');
}

export async function emailClientDocument(doc, template, data = {}) {
  const client = await User.findOne({ _id: doc.client._id || doc.client, status: { $ne: 'deactivated' } }).select('email firstName status');
  if (!client) return { sent: false };
  const settings = await BillingSettings.getMain();
  sendEmailInBackground({
    to: client.email,
    template,
    data: {
      firstName: client.firstName,
      reference: doc.reference,
      title: doc.title,
      total: money(doc.total, doc.currency),
      balance: money(doc.balance, doc.currency),
      dueDate: dateText(doc.dueDate),
      link: portalInvoiceLink(doc),
      portalReady: client.status === 'active',
      bankHtml: bankHtml(settings, doc.currency),
      ...data,
    },
    relatedType: 'Invoice',
    relatedId: doc._id,
  });
  return { sent: true };
}

/* ───────── PDF ───────── */

const INK = '#1c1b19';
const MUTED = '#6b665e';
const GOLD = '#b8964f';
const LINE = '#e6dfd2';

const STATUS_LABELS = {
  draft: 'DRAFT',
  sent: 'UNPAID',
  part_paid: 'PART PAID',
  paid: 'PAID',
  overdue: 'OVERDUE',
  void: 'VOID',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
  converted: 'ACCEPTED',
  expired: 'EXPIRED',
};

/** Builds the invoice/quote PDF and resolves with a Buffer. */
export async function buildPdf(doc) {
  const settings = await BillingSettings.getMain();
  const isQuote = doc.kind === 'quote';
  const cur = doc.currency;
  const m = (n) => money(n, cur, { forPdf: true });

  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, info: { Title: `${isQuote ? 'Quote' : 'Invoice'} ${doc.reference}`, Author: settings.businessName } });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const L = 50;
    const R = pdf.page.width - 50;
    const W = R - L;

    // Header: logo + business, document title on the right
    let y = 50;
    let textX = L;
    if (fs.existsSync(LOGO_PATH)) {
      try {
        pdf.image(LOGO_PATH, L, y, { height: 46 });
        textX = L + 58;
      } catch {
        /* unreadable logo — skip it */
      }
    }
    pdf.fillColor(INK).font('Helvetica-Bold').fontSize(15).text(settings.businessName, textX, y + 2, { width: 260 });
    pdf.font('Helvetica').fontSize(8.5).fillColor(MUTED);
    const contact = [settings.address, [settings.email, settings.phone].filter(Boolean).join('  ·  '), settings.taxId && `TIN: ${settings.taxId}`].filter(Boolean).join('\n');
    if (contact) pdf.text(contact, textX, pdf.y + 3, { width: 260, lineGap: 1.5 });
    const headerBottom = Math.max(pdf.y, y + 46);

    pdf.font('Helvetica-Bold').fontSize(24).fillColor(INK).text(isQuote ? 'QUOTE' : 'INVOICE', L, y, { width: W, align: 'right' });
    pdf.font('Helvetica').fontSize(10).fillColor(MUTED).text(doc.reference, L, pdf.y + 2, { width: W, align: 'right' });
    const status = STATUS_LABELS[displayStatus(doc)];
    if (status) {
      const tone = ['PAID', 'ACCEPTED'].includes(status) ? '#2f7a4a' : ['OVERDUE', 'VOID', 'DECLINED', 'EXPIRED'].includes(status) ? '#b3412f' : GOLD;
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(tone).text(status, L, pdf.y + 6, { width: W, align: 'right', characterSpacing: 1.2 });
    }

    y = Math.max(headerBottom, pdf.y) + 22;
    pdf.moveTo(L, y).lineTo(R, y).lineWidth(1.2).strokeColor(GOLD).stroke();
    y += 16;

    // Bill to + dates
    const client = doc.client || {};
    pdf.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(isQuote ? 'PREPARED FOR' : 'BILL TO', L, y, { characterSpacing: 1 });
    pdf.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(personName(client) || '—', L, pdf.y + 4, { width: 260 });
    pdf.font('Helvetica').fontSize(9.5).fillColor(MUTED);
    if (client.organization) pdf.text(client.organization, { width: 260 });
    if (client.email) pdf.text(client.email, { width: 260 });
    const billBottom = pdf.y;

    const dates = [
      ['Issue date', dateText(doc.issueDate)],
      [isQuote ? 'Valid until' : 'Due date', dateText(doc.dueDate)],
      ['Currency', cur],
      ...(doc.project?.title ? [['Project', `${doc.project.title}`]] : []),
    ];
    let dy = y;
    dates.forEach(([k, v]) => {
      pdf.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, R - 230, dy, { width: 90 });
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v, R - 140, dy, { width: 140, align: 'right' });
      dy = Math.max(pdf.y, dy + 14) + 2;
    });
    y = Math.max(billBottom, dy) + 14;

    if (doc.title) {
      pdf.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(doc.title, L, y, { width: W });
      y = pdf.y + 10;
    }

    // Line items
    const col = { desc: L + 10, qty: L + W * 0.47, unit: L + W * 0.55, amt: L + W * 0.77 };
    const header = () => {
      pdf.rect(L, y, W, 22).fill('#f6f1e7');
      pdf.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
      pdf.text('DESCRIPTION', col.desc, y + 7, { characterSpacing: 0.6 });
      pdf.text('QTY', col.qty, y + 7, { width: W * 0.07, align: 'right' });
      pdf.text('UNIT PRICE', col.unit, y + 7, { width: W * 0.21, align: 'right' });
      pdf.text('AMOUNT', col.amt, y + 7, { width: W * 0.23 - 10, align: 'right' });
      y += 28;
    };
    header();
    (doc.items || []).forEach((item) => {
      const h = pdf.font('Helvetica').fontSize(9.5).heightOfString(item.description, { width: W * 0.42 });
      if (y + h + 12 > pdf.page.height - 90) {
        pdf.addPage();
        y = 50;
        header();
      }
      pdf.fillColor(INK).text(item.description, col.desc, y, { width: W * 0.42 });
      pdf.text(String(item.quantity), col.qty, y, { width: W * 0.07, align: 'right' });
      pdf.text(m(item.unitPrice), col.unit, y, { width: W * 0.21, align: 'right' });
      pdf.font('Helvetica-Bold').text(m(item.amount), col.amt, y, { width: W * 0.23 - 10, align: 'right' });
      y += h + 10;
      pdf.moveTo(L, y - 4).lineTo(R, y - 4).lineWidth(0.5).strokeColor(LINE).stroke();
    });

    // Totals
    if (y > pdf.page.height - 220) {
      pdf.addPage();
      y = 50;
    }
    y += 6;
    const totals = [['Subtotal', m(doc.subtotal)]];
    if (doc.discountAmount > 0) totals.push([doc.discountType === 'percent' ? `Discount (${doc.discountValue}%)` : 'Discount', `- ${m(doc.discountAmount)}`]);
    if (doc.vatEnabled) totals.push([`VAT (${doc.vatRate}%)`, m(doc.vatAmount)]);
    const tx = R - 256; // label column; values end 10pt inside the right margin
    totals.forEach(([k, v]) => {
      pdf.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(k, tx, y, { width: 120 });
      pdf.fillColor(INK).text(v, tx + 96, y, { width: 150, align: 'right' });
      y += 17;
    });
    pdf.rect(tx - 10, y, 266, 28).fill(INK);
    pdf.font('Helvetica-Bold').fontSize(11).fillColor('#faf8f4').text('Total', tx, y + 8, { width: 120 });
    pdf.text(m(doc.total), tx + 96, y + 8, { width: 150, align: 'right' });
    y += 36;
    if (!isQuote && doc.amountPaid > 0) {
      pdf.font('Helvetica').fontSize(9.5).fillColor(MUTED).text('Paid', tx, y, { width: 120 });
      pdf.fillColor(INK).text(`- ${m(doc.amountPaid)}`, tx + 96, y, { width: 150, align: 'right' });
      y += 17;
      pdf.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text('Balance due', tx, y, { width: 120 });
      pdf.text(m(doc.balance), tx + 96, y, { width: 150, align: 'right' });
      y += 22;
    }

    const section = (title, body) => {
      if (!body) return;
      const h = pdf.font('Helvetica').fontSize(9).heightOfString(body, { width: W });
      if (y + h + 30 > pdf.page.height - 70) {
        pdf.addPage();
        y = 50;
      }
      pdf.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(title, L, y, { characterSpacing: 1 });
      pdf.font('Helvetica').fontSize(9).fillColor(INK).text(body, L, pdf.y + 4, { width: W, lineGap: 2 });
      y = pdf.y + 16;
    };

    // Payments received
    if (!isQuote && doc.payments?.length) {
      section(
        'PAYMENTS RECEIVED',
        doc.payments.map((p) => `${dateText(p.date)}  ·  ${m(p.amount)}  ·  ${p.method.replace(/_/g, ' ')}${p.reference ? `  ·  Ref ${p.reference}` : ''}  ·  Receipt ${p.receiptNumber}`).join('\n'),
      );
    }

    // How to pay
    if (!isQuote && doc.status !== 'paid' && doc.status !== 'void') {
      const banks = banksFor(settings, cur);
      if (banks.length) {
        section(
          'HOW TO PAY',
          `${banks.map((b) => `${b.bankName} (${b.currency}) — ${b.accountName} — ${b.accountNumber}${b.extra ? ` — ${b.extra}` : ''}`).join('\n')}\nPlease use ${doc.reference} as your payment reference.`,
        );
      }
    }
    section('NOTES', doc.notes);
    section('TERMS', doc.terms);
    if (doc.status === 'void' && doc.voidReason) section('CANCELLED', doc.voidReason);

    // Footer on every page
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      pdf.switchToPage(i);
      pdf.page.margins.bottom = 0; // writing inside the bottom margin must not add a page
      pdf.font('Helvetica').fontSize(8).fillColor(MUTED).text(`${settings.businessName}  ·  ${doc.reference}  ·  Page ${i + 1} of ${range.count}`, L, pdf.page.height - 40, { width: W, align: 'center', lineBreak: false });
    }
    pdf.end();
  });
}