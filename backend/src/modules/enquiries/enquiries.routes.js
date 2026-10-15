import { Router } from 'express';
import { Enquiry } from '../../models/Enquiry.js';
import { FunnelStat } from '../../models/EnquiryDraft.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission, can } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { privateDownloadUrl } from '../../services/media.service.js';
import * as v from './enquiries.validation.js';

const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = [
  { path: 'service', select: 'title slug' },
  { path: 'assignedTo', select: 'firstName lastName email photo' },
  { path: 'crmContact', select: 'name email stage enquiryCount' },
  { path: 'notes.by', select: 'firstName lastName' },
  { path: 'history.by', select: 'firstName lastName' },
  { path: 'possibleDuplicateOf', select: 'reference createdAt' },
];

function buildFilter(q, user) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.serviceId) filter.service = q.serviceId;
  if (q.kind === 'partnership') filter.kind = 'partnership';
  else if (q.kind === 'project') filter.kind = { $ne: 'partnership' };
  if (q.assignedTo === 'me') filter.assignedTo = user._id;
  else if (q.assignedTo === 'unassigned') filter.assignedTo = null;
  else if (q.assignedTo) filter.assignedTo = q.assignedTo;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = q.from;
    if (q.to) filter.createdAt.$lte = q.to;
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ reference: rx }, { 'contact.name': rx }, { 'contact.email': rx }, { 'contact.organization': rx }, { projectTitle: rx }];
  }
  return filter;
}

router.get(
  '/',
  requirePermission(P.ENQUIRIES_VIEW),
  validate(v.listEnquiriesQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const filter = buildFilter(q, req.user);
    const [items, total, counts] = await Promise.all([
      Enquiry.find(filter)
        .select('reference kind contact serviceTitle service projectTitle budgetRange status assignedTo followUpAt createdAt possibleDuplicateOf')
        .populate([{ path: 'assignedTo', select: 'firstName lastName' }])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Enquiry.countDocuments(filter),
      Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const unassigned = await Enquiry.countDocuments({ assignedTo: null, status: { $in: ['new', 'contacted', 'qualified'] } });
    return ok(res, items, {
      ...paginationMeta({ page, limit }, total),
      statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
      unassigned,
    });
  }),
);

/** Aggregate funnel: starts, step reach and submissions over a date range. */
router.get(
  '/funnel',
  requirePermission(P.ANALYTICS_VIEW),
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const rows = await FunnelStat.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: { event: '$event', step: '$step' }, count: { $sum: '$count' } } },
      { $sort: { '_id.event': 1, '_id.step': 1 } },
    ]);
    return ok(res, { days, rows: rows.map((r) => ({ event: r._id.event, step: r._id.step, count: r.count })) });
  }),
);

/** CSV export (permission-controlled, audited). */
router.get(
  '/export',
  requirePermission(P.ENQUIRIES_EXPORT),
  validate(v.listEnquiriesQuery, 'query'),
  asyncHandler(async (req, res) => {
    const filter = buildFilter(req.validatedQuery, req.user);
    const rows = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(5000).populate('assignedTo', 'firstName lastName').lean();
    const cell = (v) => {
      const s = String(v ?? '');
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV formula-injection guard
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = ['Reference', 'Date', 'Name', 'Email', 'Phone', 'Organization', 'Service', 'Budget', 'Status', 'Assigned to'];
    const lines = rows.map((e) =>
      [
        e.reference,
        new Date(e.createdAt).toISOString(),
        e.contact?.name,
        e.contact?.email,
        e.contact?.phone,
        e.contact?.organization,
        e.serviceTitle,
        e.budgetRange,
        e.status,
        e.assignedTo ? `${e.assignedTo.firstName} ${e.assignedTo.lastName}` : '',
      ].map(cell).join(','),
    );
    await audit(req, { action: 'enquiries.exported', entityType: 'Enquiry', metadata: { count: rows.length }, severity: 'notice' });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.set('Cache-Control', 'no-store');
    return res.send([header.map(cell).join(','), ...lines].join('\n'));
  }),
);

router.get(
  '/:id',
  requirePermission(P.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id).populate(POPULATE);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    return ok(res, enquiry);
  }),
);

/** Short-lived download link for a private attachment. */
router.get(
  '/:id/attachments/:attachmentId',
  requirePermission(P.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id).select('attachments reference');
    const file = enquiry?.attachments.id(req.params.attachmentId);
    if (!file) throw ApiError.notFound('Attachment not found');
    const url = privateDownloadUrl(file.publicId, { resourceType: file.resourceType, format: file.format });
    await audit(req, { action: 'enquiries.attachment_downloaded', entityType: 'Enquiry', entityId: enquiry._id, metadata: { name: file.name } });
    return ok(res, { url, expiresInSeconds: 300 });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.ENQUIRIES_MANAGE),
  validate(v.updateEnquirySchema),
  asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    if (req.body.status && req.body.status !== enquiry.status) {
      enquiry.history.push({ action: 'status_changed', from: enquiry.status, to: req.body.status, by: req.user._id });
      enquiry.status = req.body.status;
    }
    if (req.body.followUpAt !== undefined) enquiry.followUpAt = req.body.followUpAt;
    await enquiry.save();
    await audit(req, { action: 'enquiries.updated', entityType: 'Enquiry', entityId: enquiry._id, metadata: req.body });
    return ok(res, await enquiry.populate(POPULATE));
  }),
);

router.post(
  '/:id/assign',
  requirePermission(P.ENQUIRIES_ASSIGN),
  validate(v.assignSchema),
  asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    if (req.body.userId) {
      const assignee = await User.findOne({ _id: req.body.userId, accountType: 'staff', status: 'active' }).populate('role');
      if (!assignee) throw ApiError.badRequest('Choose an active staff member');
      if (!can(assignee, P.ENQUIRIES_VIEW)) throw ApiError.badRequest('This person cannot view enquiries. Update their role first.');
    }
    const from = enquiry.assignedTo ? String(enquiry.assignedTo) : 'unassigned';
    enquiry.assignedTo = req.body.userId || null;
    enquiry.history.push({ action: 'assigned', from, to: req.body.userId || 'unassigned', by: req.user._id });
    await enquiry.save();
    await audit(req, { action: 'enquiries.assigned', entityType: 'Enquiry', entityId: enquiry._id, metadata: { from, to: req.body.userId } });
    return ok(res, await enquiry.populate(POPULATE));
  }),
);

router.post(
  '/:id/notes',
  requirePermission(P.ENQUIRIES_MANAGE),
  validate(v.noteSchema),
  asyncHandler(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    enquiry.notes.push({ text: req.body.text, by: req.user._id });
    await enquiry.save();
    return ok(res, await enquiry.populate(POPULATE));
  }),
);

export default router;
