import { Router } from 'express';
import { z } from 'zod';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission, requireAnyPermission } from '../../middleware/auth.js';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { slugify } from '../../utils/slugify.js';

const router = Router();
router.use(authenticate(), requireStaff);

const permissionList = z.array(z.enum(ALL_PERMISSIONS)).max(ALL_PERMISSIONS.length);

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  permissions: permissionList.default([]),
  requiresMfa: z.boolean().optional().default(false),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(300).optional(),
    permissions: permissionList.optional(),
    requiresMfa: z.boolean().optional(),
  })
  .strict();

router.get(
  '/permissions',
  requireAnyPermission(P.ROLES_MANAGE, P.USERS_MANAGE),
  (_req, res) => ok(res, PERMISSION_GROUPS),
);

router.get(
  '/',
  requireAnyPermission(P.ROLES_MANAGE, P.USERS_VIEW),
  asyncHandler(async (req, res) => {
    const filter = req.query.portal ? { portal: String(req.query.portal) } : {};
    const roles = await Role.find(filter).sort({ isSuperAdmin: -1, isSystem: -1, name: 1 }).lean();
    const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const byRole = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    return ok(res, roles.map((r) => ({ ...r, userCount: byRole[String(r._id)] || 0 })));
  }),
);

router.post(
  '/',
  requirePermission(P.ROLES_MANAGE),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const key = slugify(req.body.name).replace(/-/g, '_');
    if (await Role.exists({ key })) throw ApiError.conflict('A role with a similar name already exists');
    const role = await Role.create({ ...req.body, key, portal: 'staff', isSystem: false, isSuperAdmin: false });
    await audit(req, { action: 'roles.created', entityType: 'Role', entityId: role._id, after: role, severity: 'notice' });
    return created(res, role);
  }),
);

router.patch(
  '/:id',
  requirePermission(P.ROLES_MANAGE),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) throw ApiError.notFound('Role not found');
    if (role.isSuperAdmin) throw ApiError.forbidden('The Super Admin role cannot be edited');
    if (role.portal !== 'staff' && req.body.permissions) {
      throw ApiError.badRequest('Client and talent roles do not use staff permissions');
    }
    const before = role.toObject();
    Object.assign(role, req.body);
    await role.save();
    // Permission changes take effect immediately because users are re-loaded per request.
    await audit(req, { action: 'roles.updated', entityType: 'Role', entityId: role._id, before, after: role, severity: 'warning' });
    return ok(res, role);
  }),
);

router.delete(
  '/:id',
  requirePermission(P.ROLES_MANAGE),
  asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) throw ApiError.notFound('Role not found');
    if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');
    const inUse = await User.countDocuments({ role: role._id });
    if (inUse) throw ApiError.conflict(`This role is assigned to ${inUse} account(s). Reassign them first.`);
    await role.deleteOne();
    await audit(req, { action: 'roles.deleted', entityType: 'Role', entityId: role._id, before: role, severity: 'warning' });
    return ok(res, { deleted: true });
  }),
);

export default router;
