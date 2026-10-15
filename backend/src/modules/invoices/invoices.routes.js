import { Router } from 'express';
import { Invoice } from '../../models/Invoice.js';
import { Project } from '../../models/Project.js';
import { User } from '../../models/User.js';
import { BillingSettings } from '../../models/BillingSettings.js';
import { nextReference } from '../../models/Counter.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { round2 } from '../../constants/billing.js';
import { audit } from '../../services/audit.service.js';
import { applyTotals, buildPdf, dateText, emailClientDocument, invoiceOut, money } from './invoices.service.js';
import * as v from './invoices.validation.js';

/** Staff side of invoices & quotes. Records only — payments happen off the website. */
const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = [
  { path: 'client', select: 'firstName lastName email organization status' },
  { path: 'project', select: 'title reference' },
  { path: 'payments.recordedBy', select: 'firstName lastName' },
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);
const label = (doc) => (doc.kind === 'quote' ? 'Quote' : 'Invoice');

async function load(id) {
  const doc = await Invoice.findById(id).populate(POPULATE);
  if (!doc) throw ApiError.notFound('Invoice or quote not found');
  return doc;
}

async function checkClient(clientId) {
  const client = await User.findOne({ _id: clientId, accountType: 'client' }).select('_id status');
  if (!client) throw ApiError.validation([{ path: 'clientId', message: 'Choose a client from the list' }]);
  if (client.status === 'deactivated') throw ApiError.validation([{ path: 'clientId', message: 'This client account is deactivated' }]);
}

async function checkProject(projectId, clientId) {
  if (!projectId) return null;
  const project = await Project.findOne({ _id: projectId, client: clientId }).select('_id');
  if (!project) throw ApiError.validation([{ path: 'projectId', message: 'Choose one of this client’s projects' }]);
  return project._id;
}

/** Only documents that haven't been paid against or answered can change. */
function assertEditable(doc) {
  if (doc.kind === 'invoice' && (!['draft', 'sent'].includes(doc.status) || doc.payments.length)) {
    throw ApiError.badRequest('This invoice can’t be edited because payments have been recorded or it was cancelled. Remove the payments first, or cancel it and create a new one.');
  }
  if (doc.kind === 'quote' && !['draft', 'sent'].includes(doc.status)) {
    throw ApiError.badRequest('This quote has already been answered or converted, so it can’t be edited.');
  }
}

/* ───────── Billing settings ───────── */

router.get(
  '/settings',
  requirePermission(P.INVOICES_VIEW),
  asyncHandler(async (_req, res) => ok(res, await BillingSettings.getMain())),
);

router.patch(
  '/settings',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.settingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await BillingSettings.getMain();
    Object.assign(settings, req.body);
    await settings.save();
    await audit(req, { action: 'invoices.settings_updated', entityType: 'BillingSettings', entityId: settings._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, settings);
  }),
);

/* ───────── Summary for the top of the page ───────── */

router.get(
  '/summary',
  requirePermission(P.INVOICES_VIEW),
  asyncHandler(async (_req, res) => {
    const today = startOfToday();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [open, paidThisMonth, quotesSent, quotesAccepted] = await Promise.all([
      Invoice.find({ kind: 'invoice', status: { $in: ['sent', 'part_paid'] } }).select('currency balance dueDate').lean(),
      Invoice.find({ kind: 'invoice', 'payments.date': { $gte: monthStart } }).select('currency payments').lean(),
      Invoice.countDocuments({ kind: 'quote', status: 'sent', $or: [{ dueDate: null }, { dueDate: { $gte: today } }] }),
      Invoice.countDocuments({ kind: 'quote', status: 'accepted' }),
    ]);
    const byCurrency = {};
    const bucket = (c) => (byCurrency[c] ||= { currency: c, outstanding: 0, overdue: 0, overdueCount: 0, paidThisMonth: 0 });
    open.forEach((i) => {
      const b = bucket(i.currency);
      b.outstanding = round2(b.outstanding + i.balance);
      if (i.dueDate && i.dueDate < today) {
        b.overdue = round2(b.overdue + i.balance);
        b.overdueCount += 1;
      }
    });
    paidThisMonth.forEach((i) =>
      i.payments.filter((p) => p.date >= monthStart).forEach((p) => {
        const b = bucket(i.currency);
        b.paidThisMonth = round2(b.paidThisMonth + p.amount);
      }),
    );
    return ok(res, { currencies: Object.values(byCurrency), unpaidCount: open.length, quotesAwaiting: quotesSent, quotesAccepted });
  }),
);

/* ───────── List / create ───────── */

router.get(
  '/',
  requirePermission(P.INVOICES_VIEW),
  validate(v.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const today = startOfToday();
    const filter = {};
    if (q.kind) filter.kind = q.kind;
    if (q.clientId) filter.client = q.clientId;
    if (q.projectId) filter.project = q.projectId;
    switch (q.status) {
      case undefined:
        break;
      case 'overdue':
        Object.assign(filter, { kind: 'invoice', status: { $in: ['sent', 'part_paid'] }, dueDate: { $lt: today } });
        break;
      case 'unpaid':
        Object.assign(filter, { kind: 'invoice', status: { $in: ['sent', 'part_paid'] } });
        break;
      case 'expired':
        Object.assign(filter, { kind: 'quote', status: 'sent', dueDate: { $lt: today } });
        break;
      default:
        filter.status = q.status;
    }
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      const clients = await User.find({ accountType: 'client', $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { organization: rx }] }).distinct('_id');
      filter.$or = [{ reference: rx }, { title: rx }, { client: { $in: clients } }];
    }
    const [items, total] = await Promise.all([
      Invoice.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);
    return ok(res, items.map((d) => invoiceOut(d)), paginationMeta({ page, limit }, total));
  }),
);

router.post(
  '/',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.createSchema),
  asyncHandler(async (req, res) => {
    const { kind, clientId, projectId, ...rest } = req.body;
    await checkClient(clientId);
    const project = await checkProject(projectId, clientId);
    const settings = await BillingSettings.getMain();
    const doc = new Invoice({
      ...rest,
      kind,
      reference: await nextReference(kind === 'quote' ? 'QUO' : 'INV'),
      status: 'draft',
      client: clientId,
      project,
      dueDate: rest.dueDate ?? addDays(rest.issueDate, kind === 'quote' ? settings.quoteValidDays : settings.paymentTermsDays),
      createdBy: req.user._id,
    });
    applyTotals(doc);
    await doc.save();
    await audit(req, { action: `invoices.${kind}_created`, entityType: 'Invoice', entityId: doc._id, summary: doc.reference });
    return created(res, invoiceOut(await doc.populate(POPULATE)));
  }),
);

/* ───────── One document ───────── */

router.get(
  '/:id',
  requirePermission(P.INVOICES_VIEW),
  asyncHandler(async (req, res) => ok(res, invoiceOut(await load(req.params.id)))),
);

router.get(
  '/:id/pdf',
  requirePermission(P.INVOICES_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    const pdf = await buildPdf(doc);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${doc.reference}.pdf"`, 'Cache-Control': 'no-store' });
    return res.send(pdf);
  }),
);

router.patch(
  '/:id',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.updateSchema),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    assertEditable(doc);
    const { clientId, projectId, ...rest } = req.body;
    const clientChanged = clientId && String(clientId) !== String(doc.client._id);
    if (clientChanged) {
      if (doc.status !== 'draft') throw ApiError.badRequest('The client can only be changed while it’s a draft.');
      await checkClient(clientId);
      doc.client = clientId;
    }
    if (projectId !== undefined || clientChanged) doc.project = await checkProject(projectId === undefined ? doc.project?._id : projectId, doc.client._id || doc.client);
    Object.assign(doc, rest);
    applyTotals(doc);
    await doc.save();
    await audit(req, { action: 'invoices.updated', entityType: 'Invoice', entityId: doc._id, summary: doc.reference, metadata: { fields: Object.keys(req.body) } });
    return ok(res, invoiceOut(await load(doc._id)));
  }),
);

router.delete(
  '/:id',
  requirePermission(P.INVOICES_MANAGE),
  asyncHandler(async (req, res) => {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) throw ApiError.notFound('Invoice or quote not found');
    if (doc.status !== 'draft') throw ApiError.badRequest('Only drafts can be deleted. Cancel it instead so the record is kept.');
    await doc.deleteOne();
    if (doc.convertedFrom) await Invoice.updateOne({ _id: doc.convertedFrom }, { status: 'accepted', convertedTo: null });
    await audit(req, { action: 'invoices.deleted', entityType: 'Invoice', entityId: doc._id, summary: doc.reference, severity: 'notice' });
    return ok(res, { deleted: true });
  }),
);

/** Send (or re-send) to the client: shows in their portal and emails them. */
router.post(
  '/:id/send',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.sendSchema),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    if (!['draft', 'sent', 'part_paid'].includes(doc.status)) throw ApiError.badRequest(`This ${label(doc).toLowerCase()} can’t be sent in its current state.`);
    if (!(doc.total > 0)) throw ApiError.badRequest('The total must be more than zero before sending.');
    if (doc.client.status === 'deactivated') throw ApiError.badRequest('This client account is deactivated.');
    const firstSend = doc.status === 'draft';
    if (firstSend) doc.status = 'sent';
    doc.sentAt = new Date();
    applyTotals(doc);
    await doc.save();
    let emailed = false;
    if (req.body.email) emailed = (await emailClientDocument(doc, doc.kind === 'quote' ? 'quoteSent' : 'invoiceSent', { resend: !firstSend })).sent;
    await audit(req, { action: firstSend ? 'invoices.sent' : 'invoices.resent', entityType: 'Invoice', entityId: doc._id, summary: doc.reference });
    return ok(res, { ...invoiceOut(doc), emailed });
  }),
);

router.post(
  '/:id/void',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.voidSchema),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    if (['void', 'converted'].includes(doc.status)) throw ApiError.badRequest('This is already closed.');
    if (doc.payments.length) throw ApiError.badRequest('Remove the recorded payments before cancelling this invoice.');
    doc.status = 'void';
    doc.voidedAt = new Date();
    doc.voidReason = req.body.reason;
    await doc.save();
    await audit(req, { action: 'invoices.voided', entityType: 'Invoice', entityId: doc._id, summary: doc.reference, metadata: { reason: req.body.reason }, severity: 'notice' });
    return ok(res, invoiceOut(doc));
  }),
);

/* ───────── Payments (recorded by staff — paid off the website) ───────── */

router.post(
  '/:id/payments',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.paymentSchema),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    if (doc.kind !== 'invoice') throw ApiError.badRequest('Payments are recorded against invoices, not quotes.');
    if (!['sent', 'part_paid'].includes(doc.status)) {
      throw ApiError.badRequest(doc.status === 'draft' ? 'Send the invoice (or mark it as sent) before recording a payment.' : 'This invoice isn’t open for payments.');
    }
    const { sendReceipt, ...payment } = req.body;
    if (round2(payment.amount) > round2(doc.balance)) {
      throw ApiError.validation([{ path: 'amount', message: `That’s more than the balance due (${money(doc.balance, doc.currency)})` }]);
    }
    const receiptNumber = await nextReference('RCT');
    doc.payments.push({ ...payment, amount: round2(payment.amount), receiptNumber, recordedBy: req.user._id });
    applyTotals(doc);
    await doc.save();
    if (sendReceipt) {
      await emailClientDocument(doc, 'paymentReceipt', {
        amount: money(payment.amount, doc.currency),
        receiptNumber,
        paymentDate: dateText(payment.date),
        fullyPaid: doc.status === 'paid',
      });
    }
    await audit(req, { action: 'invoices.payment_recorded', entityType: 'Invoice', entityId: doc._id, summary: `${doc.reference} · ${money(payment.amount, doc.currency)}` });
    return created(res, invoiceOut(await load(doc._id)));
  }),
);

router.delete(
  '/:id/payments/:pid',
  requirePermission(P.INVOICES_MANAGE),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    const payment = doc.payments.id(req.params.pid);
    if (!payment) throw ApiError.notFound('Payment not found');
    const { amount, receiptNumber } = payment;
    payment.deleteOne();
    applyTotals(doc);
    await doc.save();
    await audit(req, { action: 'invoices.payment_removed', entityType: 'Invoice', entityId: doc._id, summary: `${doc.reference} · ${receiptNumber}`, metadata: { amount }, severity: 'notice' });
    return ok(res, invoiceOut(await load(doc._id)));
  }),
);

/* ───────── Quotes ───────── */

/** Staff record the client's answer (e.g. given by phone). */
router.post(
  '/:id/decision',
  requirePermission(P.INVOICES_MANAGE),
  validate(v.decisionSchema),
  asyncHandler(async (req, res) => {
    const doc = await load(req.params.id);
    if (doc.kind !== 'quote' || doc.status !== 'sent') throw ApiError.badRequest('Only a sent quote can be accepted or declined.');
    doc.status = req.body.decision;
    doc.decision = { at: new Date(), by: req.user._id, comment: req.body.comment };
    await doc.save();
    await audit(req, { action: `invoices.quote_${req.body.decision}`, entityType: 'Invoice', entityId: doc._id, summary: doc.reference });
    return ok(res, invoiceOut(doc));
  }),
);

/** Turn a quote into a draft invoice with the same lines. */
router.post(
  '/:id/convert',
  requirePermission(P.INVOICES_MANAGE),
  asyncHandler(async (req, res) => {
    const quote = await load(req.params.id);
    if (quote.kind !== 'quote' || !['sent', 'accepted'].includes(quote.status)) throw ApiError.badRequest('Only a sent or accepted quote can be turned into an invoice.');
    const settings = await BillingSettings.getMain();
    const issueDate = new Date();
    const invoice = new Invoice({
      kind: 'invoice',
      reference: await nextReference('INV'),
      status: 'draft',
      client: quote.client._id,
      project: quote.project?._id || null,
      title: quote.title,
      currency: quote.currency,
      issueDate,
      dueDate: addDays(issueDate, settings.paymentTermsDays),
      items: quote.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      vatEnabled: quote.vatEnabled,
      vatRate: quote.vatRate,
      notes: quote.notes,
      terms: settings.defaultTerms,
      convertedFrom: quote._id,
      createdBy: req.user._id,
    });
    applyTotals(invoice);
    await invoice.save();
    quote.status = 'converted';
    quote.convertedTo = invoice._id;
    if (!quote.decision?.at) quote.decision = { at: new Date(), by: req.user._id, comment: '' };
    await quote.save();
    await audit(req, { action: 'invoices.quote_converted', entityType: 'Invoice', entityId: quote._id, summary: `${quote.reference} → ${invoice.reference}` });
    return created(res, invoiceOut(await load(invoice._id)));
  }),
);

export default router;