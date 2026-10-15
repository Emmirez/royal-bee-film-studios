import { Router } from 'express';
import { z } from 'zod';
import { Contact } from '../../models/Contact.js';
import { Enquiry } from '../../models/Enquiry.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';

/** CRM contacts (Stage 2 foundation; the full sales pipeline arrives in Stage 7). */
const router = Router();
router.use(authenticate(), requireStaff);

const STAGES = ['lead', 'prospect', 'client', 'inactive'];
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(30),
    organization: z.string().trim().max(160),
    kind: z.enum(['individual', 'organization']),
    stage: z.enum(STAGES),
    owner: objectId.nullable(),
    followUpAt: z.coerce.date().nullable(),
    preferredContactMethod: z.enum(['email', 'phone', 'any']),
    tags: z.array(z.string().trim().max(40)).max(20),
  })
  .partial()
  .strict();

router.get(
  '/',
  requirePermission(P.CRM_VIEW),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (STAGES.includes(req.query.stage)) filter.stage = req.query.stage;
    if (req.query.owner === 'me') filter.owner = req.user._id;
    if (req.query.followUp === 'due') filter.followUpAt = { $ne: null, $lte: new Date() };
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { organization: rx }];
    }
    const [items, total] = await Promise.all([
      Contact.find(filter)
        .select('-activity -notes')
        .populate('owner', 'firstName lastName')
        .sort({ lastContactAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta({ page, limit }, total));
  }),
);

router.get(
  '/:id',
  requirePermission(P.CRM_VIEW),
  asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id)
      .populate('owner', 'firstName lastName email')
      .populate('servicesOfInterest', 'title slug')
      .populate('notes.by', 'firstName lastName')
      .lean();
    if (!contact) throw ApiError.notFound('Contact not found');
    const [enquiries, messages] = await Promise.all([
      Enquiry.find({ crmContact: contact._id }).select('reference serviceTitle status createdAt').sort({ createdAt: -1 }).limit(50).lean(),
      ContactMessage.find({ crmContact: contact._id }).select('subject status createdAt').sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    contact.activity = (contact.activity || []).slice().reverse();
    return ok(res, { ...contact, enquiries, messages });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.CRM_MANAGE),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw ApiError.notFound('Contact not found');
    if (req.body.owner) {
      const owner = await User.exists({ _id: req.body.owner, accountType: 'staff', status: 'active' });
      if (!owner) throw ApiError.badRequest('Choose an active staff member as owner');
    }
    const before = contact.toObject();
    if (req.body.stage && req.body.stage !== contact.stage) {
      contact.activity.push({ type: 'stage_changed', summary: `${contact.stage} → ${req.body.stage}`, by: req.user._id });
    }
    contact.set(req.body);
    await contact.save();
    await audit(req, { action: 'crm.contact_updated', entityType: 'Contact', entityId: contact._id, before, after: contact });
    return ok(res, contact);
  }),
);

router.post(
  '/:id/notes',
  requirePermission(P.CRM_MANAGE),
  validate(z.object({ text: z.string().trim().min(1).max(4000) })),
  asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (!contact) throw ApiError.notFound('Contact not found');
    contact.notes.push({ text: req.body.text, by: req.user._id });
    contact.activity.push({ type: 'note', summary: req.body.text.slice(0, 120), by: req.user._id });
    await contact.save();
    return ok(res, contact);
  }),
);

export default router;
