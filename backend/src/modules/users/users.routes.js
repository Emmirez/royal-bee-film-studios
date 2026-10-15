import { Router } from 'express';
import { asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import * as c from './users.controller.js';
import * as v from './users.validation.js';

const router = Router();
router.use(authenticate(), requireStaff);

router.get('/', requirePermission(P.USERS_VIEW), validate(v.listStaffQuery, 'query'), asyncHandler(c.listStaff));
router.get('/:id', requirePermission(P.USERS_VIEW), asyncHandler(c.getStaff));
router.post('/', requirePermission(P.USERS_MANAGE), validate(v.inviteStaffSchema), asyncHandler(c.inviteStaff));
router.patch('/:id', requirePermission(P.USERS_MANAGE), validate(v.updateStaffSchema), asyncHandler(c.updateStaff));
router.post('/:id/resend-invite', requirePermission(P.USERS_MANAGE), asyncHandler(c.resendInvite));
router.post('/:id/deactivate', requirePermission(P.USERS_MANAGE), asyncHandler(c.deactivateStaff));
router.post('/:id/reactivate', requirePermission(P.USERS_MANAGE), asyncHandler(c.reactivateStaff));
router.post('/:id/revoke-sessions', requirePermission(P.USERS_MANAGE), asyncHandler(c.revokeStaffSessions));
router.delete('/:id', requirePermission(P.USERS_MANAGE), asyncHandler(c.deleteStaff));

export default router;
