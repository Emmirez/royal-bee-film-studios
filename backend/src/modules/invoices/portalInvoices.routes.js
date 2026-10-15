import { Router } from 'express';
import { Invoice } from '../../models/Invoice.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireClient } from '../../middleware/auth.js';
import { audit } from '../../services/audit.service.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { BillingSettings } from '../../models/BillingSettings.js';
import { staffRecipientsFor } from '../projects/projects.service.js';
import { adminInvoiceLink, banksFor, buildPdf, displayStatus, invoiceOut, money } from './invoices.service.js';
import { decisionSchema } from './invoices.validation.js';

/** Client portal: the client's own invoices and quotes (never drafts). */
const router = Router();
router.use(authenticate(), requireClient);

const POPULATE = [
  { path: 'client', select: 'firstName lastName email organization' },
  { path: 'project', select: 'title reference manager' },
];

async function own(req) {
  const doc = await Invoice.findOne({ _id: req.params.id, client: req.user._id, status: { $ne: 'draft' } }).populate(POPULATE);
  if (!doc) throw ApiError.notFound('Not found');
  return doc;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const docs = await Invoice.find({ client: req.user._id, status: { $nin: ['draft'] } }).populate(POPULATE).sort({ issueDate: -1, createdAt: -1 }).limit(300);
    return ok(res, docs.map((d) => invoiceOut(d, { forClient: true })));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await own(req);
    const settings = await BillingSettings.getMain();
    const showBanks = doc.kind === 'invoice' && ['sent', 'part_paid'].includes(doc.status);
    return ok(res, {
      ...invoiceOut(doc, { forClient: true }),
      business: { name: settings.businessName, address: settings.address, email: settings.email, phone: settings.phone, taxId: settings.taxId },
      bankAccounts: showBanks ? banksFor(settings, doc.currency) : [],
    });
  }),
);

router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const doc = await own(req);
    const pdf = await buildPdf(doc);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${doc.reference}.pdf"`, 'Cache-Control': 'no-store' });
    return res.send(pdf);
  }),
);

/** The client accepts or declines a quote. */
router.post(
  '/:id/decision',
  validate(decisionSchema),
  asyncHandler(async (req, res) => {
    const doc = await own(req);
    if (doc.kind !== 'quote' || doc.status !== 'sent') throw ApiError.badRequest('This quote has already been answered.');
    if (displayStatus(doc) === 'expired') throw ApiError.badRequest('This quote has expired. Message the studio and they’ll send you an updated one.');
    const { decision, comment } = req.body;
    doc.status = decision;
    doc.decision = { at: new Date(), by: req.user._id, comment };
    await doc.save();

    const to = await staffRecipientsFor(doc.project || {});
    if (to?.length) {
      sendEmailInBackground({
        to,
        template: 'quoteDecisionAlert',
        data: {
          clientName: `${req.user.firstName} ${req.user.lastName}`.trim(),
          reference: doc.reference,
          title: doc.title,
          total: money(doc.total, doc.currency),
          accepted: decision === 'accepted',
          comment,
          link: adminInvoiceLink(doc),
        },
        relatedType: 'Invoice',
        relatedId: doc._id,
      });
    }
    await audit(req, { action: `portal.quote_${decision}`, entityType: 'Invoice', entityId: doc._id, summary: doc.reference });
    return ok(res, invoiceOut(doc, { forClient: true }));
  }),
);

export default router;