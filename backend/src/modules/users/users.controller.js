import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { AuthToken } from '../../models/AuthToken.js';
import { Session } from '../../models/Session.js';
import { Enquiry } from '../../models/Enquiry.js';
import { Contact } from '../../models/Contact.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { randomToken, sha256 } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { audit } from '../../services/audit.service.js';
import { sendEmail } from '../../services/email.service.js';
import { revokeAllSessions } from '../../services/token.service.js';

async function getStaffRole(roleId) {
  const role = await Role.findById(roleId);
  if (!role) throw ApiError.badRequest('Selected role does not exist');
  if (role.portal !== 'staff') throw ApiError.badRequest('Selected role is not a staff role');
  return role;
}

/** Only a Super Admin may grant or remove the Super Admin role. */
function guardSuperAdminRole(actor, role) {
  if (role?.isSuperAdmin && !actor.role?.isSuperAdmin) {
    throw ApiError.forbidden('Only a Super Admin can assign the Super Admin role');
  }
}

async function countActiveSuperAdmins() {
  const roles = await Role.find({ isSuperAdmin: true }).select('_id');
  return User.countDocuments({ role: { $in: roles.map((r) => r._id) }, status: 'active' });
}

async function sendInvite(req, user) {
  await AuthToken.updateMany({ user: user._id, type: 'invite', usedAt: null }, { usedAt: new Date() });
  const token = randomToken();
  const record = await AuthToken.create({
    user: user._id,
    type: 'invite',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.inviteExpiresHours * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  const link = `${env.clientUrls[0]}/accept-invite?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: user.email,
    template: 'staffInvite',
    data: { firstName: user.firstName, inviterName: req.user.fullName, link, expiresHours: env.inviteExpiresHours },
    idempotencyKey: `invite:${record._id}`,
    relatedType: 'User',
    relatedId: user._id,
  });
  // When email isn't configured, return the link to the admin (dev / setup state) so onboarding isn't blocked.
  return { emailStatus: result.status, inviteLink: result.sent ? undefined : link, expiresAt: record.expiresAt };
}

export async function listStaff(req, res) {
  const q = req.validatedQuery;
  const { page, limit, skip } = parsePagination(q);
  const filter = { accountType: 'staff' };
  if (q.status) filter.status = q.status;
  if (q.roleId) filter.role = q.roleId;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { jobTitle: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).populate('role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return ok(res, items.map((u) => u.toSafeJSON()), paginationMeta({ page, limit }, total));
}

export async function getStaff(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  return ok(res, user.toSafeJSON());
}

export async function inviteStaff(req, res) {
  const { roleId, email, ...rest } = req.body;
  const role = await getStaffRole(roleId);
  guardSuperAdminRole(req.user, role);
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    ...rest,
    email,
    role: role._id,
    accountType: 'staff',
    status: 'invited',
    invitedBy: req.user._id,
  });
  await user.populate('role');
  const invite = await sendInvite(req, user);
  await audit(req, { action: 'users.invited', entityType: 'User', entityId: user._id, after: user.toSafeJSON() });
  return created(res, { user: user.toSafeJSON(), invite });
}

export async function resendInvite(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.status !== 'invited') throw ApiError.badRequest('This person has already accepted their invitation');
  const invite = await sendInvite(req, user);
  await audit(req, { action: 'users.invite_resent', entityType: 'User', entityId: user._id });
  return ok(res, { invite });
}

export async function updateStaff(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  const before = user.toSafeJSON();
  const { roleId, ...rest } = req.body;

  if (roleId && String(roleId) !== String(user.role?._id)) {
    const newRole = await getStaffRole(roleId);
    guardSuperAdminRole(req.user, newRole);
    guardSuperAdminRole(req.user, user.role);
    if (user.role?.isSuperAdmin && !newRole.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
      throw ApiError.badRequest('You cannot remove the last active Super Admin');
    }
    user.role = newRole._id;
    user.tokenVersion += 1; // force fresh tokens with the new permissions
  }
  Object.assign(user, rest);
  await user.save();
  await user.populate('role');
  await audit(req, {
    action: roleId ? 'users.updated_role' : 'users.updated',
    entityType: 'User',
    entityId: user._id,
    before,
    after: user.toSafeJSON(),
    severity: roleId ? 'notice' : 'info',
  });
  return ok(res, user.toSafeJSON());
}

export async function deactivateStaff(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot deactivate your own account');
  guardSuperAdminRole(req.user, user.role);
  if (user.role?.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    throw ApiError.badRequest('You cannot deactivate the last active Super Admin');
  }
  user.status = 'deactivated';
  user.deactivatedAt = new Date();
  user.deactivatedBy = req.user._id;
  user.tokenVersion += 1;
  await user.save();
  await revokeAllSessions(user._id, 'deactivated');
  await AuthToken.updateMany({ user: user._id, usedAt: null }, { usedAt: new Date() });
  await audit(req, { action: 'users.deactivated', entityType: 'User', entityId: user._id, severity: 'warning' });
  return ok(res, user.toSafeJSON());
}

export async function reactivateStaff(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).select('+passwordHash').populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.status !== 'deactivated') throw ApiError.badRequest('This account is not deactivated');
  guardSuperAdminRole(req.user, user.role);
  user.status = user.passwordHash ? 'active' : 'invited';
  user.deactivatedAt = undefined;
  user.deactivatedBy = undefined;
  await user.save();
  await audit(req, { action: 'users.reactivated', entityType: 'User', entityId: user._id, severity: 'notice' });
  return ok(res, user.toSafeJSON());
}

export async function revokeStaffSessions(req, res) {
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  guardSuperAdminRole(req.user, user.role);
  user.tokenVersion += 1;
  await user.save();
  await revokeAllSessions(user._id, 'admin_revoked');
  await audit(req, { action: 'users.sessions_revoked', entityType: 'User', entityId: user._id, severity: 'warning' });
  return ok(res, { revoked: true });
}


/**
 * Permanently delete a staff account. Super Admin only, and only once the
 * account has been deactivated (so there's always a deliberate two-step removal).
 * Their past work stays: enquiries/contacts they handled are simply unassigned,
 * and the audit log keeps a record of who they were.
 */
export async function deleteStaff(req, res) {
  if (!req.user.role?.isSuperAdmin) throw ApiError.forbidden('Only a Super Admin can delete staff accounts');
  const user = await User.findOne({ _id: req.params.id, accountType: 'staff' }).populate('role');
  if (!user) throw ApiError.notFound('Staff member not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');
  if (user.status !== 'deactivated') throw ApiError.badRequest('Deactivate this account first, then delete it');

  const snapshot = { name: user.fullName, email: user.email, role: user.role?.name || '' };

  await Promise.all([
    Enquiry.updateMany({ assignedTo: user._id }, { assignedTo: null }),
    Contact.updateMany({ owner: user._id }, { owner: null }),
    ContactMessage.updateMany({ handledBy: user._id }, { handledBy: null }),
    Session.deleteMany({ user: user._id }),
    AuthToken.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();

  await audit(req, { action: 'users.deleted', entityType: 'User', entityId: user._id, metadata: snapshot, severity: 'warning' });
  return ok(res, { deleted: true });
}
