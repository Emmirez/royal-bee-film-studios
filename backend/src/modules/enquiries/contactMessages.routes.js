import { Router } from 'express';
import { z } from 'zod';
import { ContactMessage } from '../../models/ContactMessage.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';

const router = Router();
router.use(authenticate(), requireStaff);

const STATUSES = ['new', 'read', 'replied', 'archived', 'spam'];

router.get(
  '/',
  requirePermission(P.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
    }
    const [items, total, unread] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: 'new' }),
    ]);
    return ok(res, items, { ...paginationMeta({ page, limit }, total), unread });
  }),
);

router.get(
  '/:id',
  requirePermission(P.ENQUIRIES_VIEW),
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id).populate('handledBy', 'firstName lastName');
    if (!message) throw ApiError.notFound('Message not found');
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }
    return ok(res, message);
  }),
);

router.patch(
  '/:id',
  requirePermission(P.ENQUIRIES_MANAGE),
  validate(z.object({ status: z.enum(STATUSES) })),
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, handledBy: req.user._id },
      { new: true, runValidators: true },
    );
    if (!message) throw ApiError.notFound('Message not found');
    await audit(req, { action: 'contact_messages.updated', entityType: 'ContactMessage', entityId: message._id, metadata: req.body });
    return ok(res, message);
  }),
);

/** Delete a message for good (spam, tests). The CRM contact and audit trail are kept. */
router.delete(
  '/:id',
  requirePermission(P.ENQUIRIES_MANAGE),
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) throw ApiError.notFound('Message not found');
    await message.deleteOne();
    await audit(req, {
      action: 'contact_messages.deleted',
      entityType: 'ContactMessage',
      entityId: message._id,
      summary: `${message.name} <${message.email}>`,
      metadata: { subject: message.subject },
      severity: 'notice',
    });
    return ok(res, { deleted: true });
  }),
);

export default router;
