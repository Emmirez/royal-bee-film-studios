import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { MfaRecovery } from '../../models/MfaRecovery.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, clientIp } from '../../utils/http.js';
import { randomToken, sha256, hashIp } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { audit } from '../../services/audit.service.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { verifyMfaChallengeToken } from '../../services/token.service.js';

/** How long the account owner (and other Super Admins) have to cancel a recovery. */
export const RECOVERY_WAIT_HOURS = 24;
const CONFIRM_LINK_MINUTES = 60;
const ACTIVE = ['pending_confirm', 'waiting'];

const site = () => env.clientUrls[0].replace(/\/+$/, '');

async function otherSuperAdminEmails(userId) {
  const roles = await Role.find({ isSuperAdmin: true }).select('_id');
  const admins = await User.find({ _id: { $ne: userId }, role: { $in: roles.map((r) => r._id) }, status: 'active' }).select('email');
  return admins.map((a) => a.email);
}

/**
 * Step 1 — from the 2FA screen at sign-in. The challenge token proves the password was correct.
 * Sends a confirmation link to the account's email.
 */
export async function requestRecovery(req, res) {
  let payload;
  try {
    payload = verifyMfaChallengeToken(req.body.challengeToken);
  } catch {
    throw ApiError.unauthorized('Your sign-in attempt expired. Please sign in again.', 'MFA_CHALLENGE_EXPIRED');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active' || user.tokenVersion !== payload.tv || !user.mfa?.enabled) {
    throw ApiError.unauthorized('Please sign in again');
  }

  const waiting = await MfaRecovery.findOne({ user: user._id, status: 'waiting' });
  if (waiting) return ok(res, { status: 'waiting', releaseAt: waiting.releaseAt });

  await MfaRecovery.updateMany({ user: user._id, status: 'pending_confirm' }, { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'replaced' });
  const token = randomToken();
  await MfaRecovery.create({
    user: user._id,
    confirmTokenHash: sha256(token),
    confirmExpiresAt: new Date(Date.now() + CONFIRM_LINK_MINUTES * 60 * 1000),
    requestIpHash: hashIp(clientIp(req)),
  });

  sendEmailInBackground({
    to: user.email,
    template: 'mfaRecoveryConfirm',
    data: { firstName: user.firstName, link: `${site()}/mfa-recovery?token=${encodeURIComponent(token)}`, expiresMinutes: CONFIRM_LINK_MINUTES, waitHours: RECOVERY_WAIT_HOURS },
  });
  await audit(req, { action: 'auth.mfa_recovery_requested', entityType: 'User', entityId: user._id, severity: 'warning' });
  return ok(res, { status: 'email_sent' });
}

/** Step 2 — the email link. Starts the waiting period and alerts the owner + other Super Admins. */
export async function confirmRecovery(req, res) {
  const rec = await MfaRecovery.findOne({ confirmTokenHash: sha256(req.body.token), status: 'pending_confirm' });
  if (!rec || rec.confirmExpiresAt < new Date()) throw ApiError.badRequest('This recovery link is invalid or has expired. Start again from the sign-in page.');
  const user = await User.findById(rec.user);
  if (!user || user.status !== 'active' || !user.mfa?.enabled) throw ApiError.badRequest('This recovery link is no longer needed.');

  const cancelToken = randomToken();
  rec.status = 'waiting';
  rec.confirmedAt = new Date();
  rec.releaseAt = new Date(Date.now() + RECOVERY_WAIT_HOURS * 60 * 60 * 1000);
  rec.confirmTokenHash = undefined;
  rec.cancelTokenHash = sha256(cancelToken);
  await rec.save();

  const cancelLink = `${site()}/mfa-recovery/cancel?token=${encodeURIComponent(cancelToken)}`;
  sendEmailInBackground({
    to: user.email,
    template: 'mfaRecoveryStarted',
    data: { firstName: user.firstName, releaseAt: rec.releaseAt, cancelLink, waitHours: RECOVERY_WAIT_HOURS },
  });
  const admins = await otherSuperAdminEmails(user._id);
  if (admins.length) {
    sendEmailInBackground({
      to: admins,
      template: 'mfaRecoveryAdminAlert',
      data: { name: user.fullName, email: user.email, releaseAt: rec.releaseAt, cancelLink, waitHours: RECOVERY_WAIT_HOURS },
    });
  }
  await audit(req, { action: 'auth.mfa_recovery_confirmed', entityType: 'User', entityId: user._id, metadata: { releaseAt: rec.releaseAt }, severity: 'critical' });
  return ok(res, { releaseAt: rec.releaseAt, waitHours: RECOVERY_WAIT_HOURS });
}

/** Cancel link — from the owner's email or the alert sent to other Super Admins. */
export async function cancelRecovery(req, res) {
  const rec = await MfaRecovery.findOne({ cancelTokenHash: sha256(req.body.token), status: { $in: ACTIVE } });
  if (!rec) throw ApiError.badRequest('This recovery request has already been cancelled or completed.');
  rec.status = 'cancelled';
  rec.cancelledAt = new Date();
  rec.cancelReason = 'cancel_link';
  await rec.save();
  const user = await User.findById(rec.user);
  if (user) {
    sendEmailInBackground({ to: user.email, template: 'mfaRecoveryCancelled', data: { firstName: user.firstName } });
  }
  await audit(req, { action: 'auth.mfa_recovery_cancelled', entityType: 'User', entityId: rec.user, severity: 'warning' });
  return ok(res, { cancelled: true });
}

/**
 * Called during password sign-in for accounts with 2FA on.
 * If a recovery has finished its waiting period, turn 2FA off and return true
 * (sign-in then continues without the code; Super Admins must set 2FA up again).
 */
export async function completeRecoveryIfDue(user, req) {
  const rec = await MfaRecovery.findOne({ user: user._id, status: 'waiting', releaseAt: { $lte: new Date() } });
  if (!rec) return false;
  await User.updateOne(
    { _id: user._id },
    { $set: { 'mfa.enabled': false, 'mfa.recoveryCodeHashes': [] }, $unset: { 'mfa.secretEncrypted': '', 'mfa.pendingSecretEncrypted': '', 'mfa.enabledAt': '' } },
  );
  user.mfa.enabled = false;
  rec.status = 'completed';
  rec.completedAt = new Date();
  await rec.save();
  sendEmailInBackground({ to: user.email, template: 'mfaChanged', data: { firstName: user.firstName, enabled: false } });
  await audit(req, { action: 'auth.mfa_recovery_completed', entityType: 'User', entityId: user._id, severity: 'critical' });
  return true;
}

/** A successful 2FA sign-in proves the owner still has access — cancel any open recovery. */
export async function cancelOpenRecoveries(userId, reason = 'signed_in_with_2fa') {
  await MfaRecovery.updateMany({ user: userId, status: { $in: ACTIVE } }, { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason });
}