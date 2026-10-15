import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { AuthToken } from '../../models/AuthToken.js';
import { Project } from '../../models/Project.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { randomToken, sha256 } from '../../utils/crypto.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission, requireAnyPermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { env } from '../../config/env.js';
import { audit } from '../../services/audit.service.js';
import { sendEmail } from '../../services/email.service.js';
import { revokeAllSessions } from '../../services/token.service.js';
import { getClientRole, site } from '../projects/projects.service.js';

/** Staff side: client portal accounts (invite-only). */
const router = Router();
router.use(authenticate(), requireStaff);

const fields = {
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  phone: z.string().trim().max(30).optional().default(''),
  organization: z.string().trim().max(160).optional().default(''),
};
const inviteSchema = z.object({ ...fields, email: z.string().trim().toLowerCase().email('Enter a valid email').max(254) });
const updateSchema = z
  .object({ firstName: fields.firstName.optional(), lastName: fields.lastName.optional(), phone: z.string().trim().max(30).optional(), organization: z.string().trim().max(160).optional() })
  .strict();
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['invited', 'active', 'deactivated']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const clientOut = (u, projectCount = 0) => ({
  id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  fullName: `${u.firstName} ${u.lastName}`.trim(),
  email: u.email,
  phone: u.phone,
  organization: u.organization,
  status: u.status,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  projectCount,
});

async function loadClient(id) {
  const user = await User.findOne({ _id: id, accountType: 'client' });
  if (!user) throw ApiError.notFound('Client not found');
  return user;
}

async function sendClientInvite(req, user) {
  await AuthToken.updateMany({ user: user._id, type: 'invite', usedAt: null }, { usedAt: new Date() });
  const token = randomToken();
  const record = await AuthToken.create({
    user: user._id,
    type: 'invite',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.inviteExpiresHours * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  const link = `${site()}/accept-invite?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: user.email,
    template: 'clientInvite',
    data: { firstName: user.firstName, inviterName: req.user.fullName, link, expiresHours: env.inviteExpiresHours },
    idempotencyKey: `client-invite:${record._id}`,
    relatedType: 'User',
    relatedId: user._id,
  });
  // When email isn't configured, hand the link back so staff can share it another way.
  return { emailStatus: result.status, inviteLink: result.sent ? undefined : link, expiresAt: record.expiresAt };
}

router.get(
  '/',
  requireAnyPermission(P.PROJECTS_VIEW, P.CLIENTS_MANAGE),
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const filter = { accountType: 'client' };
    if (q.status) filter.status = q.status;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { organization: rx }];
    }
    const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
    const counts = await Project.aggregate([{ $match: { client: { $in: items.map((u) => u._id) } } }, { $group: { _id: '$client', n: { $sum: 1 } } }]);
    const countFor = (id) => counts.find((c) => String(c._id) === String(id))?.n || 0;
    return ok(res, items.map((u) => clientOut(u, countFor(u._id))), paginationMeta({ page, limit }, total));
  }),
);

router.post(
  '/',
  requirePermission(P.CLIENTS_MANAGE),
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const { email, ...rest } = req.body;
    if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
    const role = await getClientRole();
    const user = await User.create({ ...rest, email, role: role._id, accountType: 'client', status: 'invited', invitedBy: req.user._id });
    const invite = await sendClientInvite(req, user);
    await audit(req, { action: 'clients.invited', entityType: 'User', entityId: user._id, summary: email });
    return created(res, { client: clientOut(user), invite });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.CLIENTS_MANAGE),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await loadClient(req.params.id);
    Object.assign(user, req.body);
    await user.save();
    await audit(req, { action: 'clients.updated', entityType: 'User', entityId: user._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, clientOut(user, await Project.countDocuments({ client: user._id })));
  }),
);

router.post(
  '/:id/resend-invite',
  requirePermission(P.CLIENTS_MANAGE),
  asyncHandler(async (req, res) => {
    const user = await loadClient(req.params.id);
    if (user.status !== 'invited') throw ApiError.badRequest('This client has already set up their account');
    const invite = await sendClientInvite(req, user);
    await audit(req, { action: 'clients.invite_resent', entityType: 'User', entityId: user._id });
    return ok(res, { invite });
  }),
);

router.post(
  '/:id/deactivate',
  requirePermission(P.CLIENTS_MANAGE),
  asyncHandler(async (req, res) => {
    const user = await loadClient(req.params.id);
    user.status = 'deactivated';
    user.deactivatedAt = new Date();
    user.deactivatedBy = req.user._id;
    user.tokenVersion += 1;
    await user.save();
    await revokeAllSessions(user._id, 'deactivated');
    await AuthToken.updateMany({ user: user._id, usedAt: null }, { usedAt: new Date() });
    await audit(req, { action: 'clients.deactivated', entityType: 'User', entityId: user._id, severity: 'notice' });
    return ok(res, clientOut(user));
  }),
);

router.post(
  '/:id/reactivate',
  requirePermission(P.CLIENTS_MANAGE),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, accountType: 'client' }).select('+passwordHash');
    if (!user) throw ApiError.notFound('Client not found');
    if (user.status !== 'deactivated') throw ApiError.badRequest('This client is not deactivated');
    // Someone who never accepted their invite goes back to "invited" so a fresh invite can be sent.
    user.status = user.passwordHash ? 'active' : 'invited';
    user.deactivatedAt = undefined;
    user.deactivatedBy = undefined;
    await user.save();
    await audit(req, { action: 'clients.reactivated', entityType: 'User', entityId: user._id, severity: 'notice' });
    return ok(res, clientOut(user));
  }),
);

export default router;