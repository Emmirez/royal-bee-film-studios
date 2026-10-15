import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { AuthToken } from '../../models/AuthToken.js';
import { Session } from '../../models/Session.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/http.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { randomToken, sha256 } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { audit } from '../../services/audit.service.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import {
  REFRESH_COOKIE,
  createSession,
  rotateSession,
  refreshCookieOptions,
  revokeAllSessions,
  revokeSessionByToken,
  signAccessToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} from '../../services/token.service.js';
import {
  createPendingSecret,
  generateRecoveryCodes,
  matchRecoveryCode,
  verifyTotp,
} from '../../services/mfa.service.js';
import { cancelOpenRecoveries, completeRecoveryIfDue } from './mfaRecovery.controller.js';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Constant-time-ish dummy hash so unknown emails take as long as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const mfaSetupRequired = (user) => env.mfaEnforce && user.role?.requiresMfa && !user.mfa?.enabled;

async function issueSession(res, user, req, { mfaVerified }) {
  const { session, refreshToken } = await createSession(user, req, { mfaVerified });
  const mfa = mfaSetupRequired(user) ? 'pending' : 'ok';
  const accessToken = signAccessToken(user, { sessionId: session._id, mfa });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return { accessToken, mfaSetupRequired: mfa === 'pending' };
}

async function findUserForLogin(email) {
  return User.findOne({ email })
    .select('+passwordHash +failedLoginCount +lockUntil +mfa.secretEncrypted +mfa.recoveryCodeHashes')
    .populate('role');
}

/* ───────────── Login ───────────── */

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await findUserForLogin(email);
  const genericError = ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');

  if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    await audit(req, { action: 'auth.login_failed', summary: 'Unknown email or no password', metadata: { email }, severity: 'notice' });
    throw genericError;
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Too many failed attempts. Try again in ${minutes} minute(s).`, 'ACCOUNT_LOCKED');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
      await audit(req, { action: 'auth.account_locked', entityType: 'User', entityId: user._id, severity: 'warning' });
    }
    await user.save();
    await audit(req, { action: 'auth.login_failed', entityType: 'User', entityId: user._id, severity: 'notice' });
    throw genericError;
  }

  if (user.status !== 'active') {
    throw ApiError.unauthorized('This account is not active. Contact your administrator.', 'ACCOUNT_INACTIVE');
  }

  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save();

  // A finished 24-hour email recovery turns 2FA off here, so sign-in continues without the code.
  if (user.mfa?.enabled && !(await completeRecoveryIfDue(user, req))) {
    return ok(res, { mfaRequired: true, challengeToken: signMfaChallengeToken(user) });
  }

  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueSession(res, user, req, { mfaVerified: false });
  await audit(req, { action: 'auth.login', entityType: 'User', entityId: user._id });
  return ok(res, { ...tokens, user: user.toSafeJSON() });
}

export async function verifyMfaLogin(req, res) {
  const { challengeToken, code } = req.body;
  let payload;
  try {
    payload = verifyMfaChallengeToken(challengeToken);
  } catch {
    throw ApiError.unauthorized('Your sign-in attempt expired. Please sign in again.', 'MFA_CHALLENGE_EXPIRED');
  }
  const user = await User.findById(payload.sub)
    .select('+mfa.secretEncrypted +mfa.recoveryCodeHashes +failedLoginCount +lockUntil')
    .populate('role');
  if (!user || user.status !== 'active' || user.tokenVersion !== payload.tv || !user.mfa?.enabled) {
    throw ApiError.unauthorized('Please sign in again');
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(423, 'Too many failed attempts. Try again later.', 'ACCOUNT_LOCKED');
  }

  let passed = verifyTotp(user.mfa.secretEncrypted, code);
  let usedRecovery = false;
  if (!passed && code.length > 6) {
    const idx = await matchRecoveryCode(user.mfa.recoveryCodeHashes, code);
    if (idx >= 0) {
      user.mfa.recoveryCodeHashes.splice(idx, 1);
      passed = true;
      usedRecovery = true;
    }
  }

  if (!passed) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    await audit(req, { action: 'auth.mfa_failed', entityType: 'User', entityId: user._id, severity: 'notice' });
    throw ApiError.unauthorized('That code is not valid', 'INVALID_MFA_CODE');
  }

  user.failedLoginCount = 0;
  user.lastLoginAt = new Date();
  await user.save();
  await cancelOpenRecoveries(user._id);
  const tokens = await issueSession(res, user, req, { mfaVerified: true });
  await audit(req, {
    action: usedRecovery ? 'auth.login_recovery_code' : 'auth.login',
    entityType: 'User',
    entityId: user._id,
    severity: usedRecovery ? 'warning' : 'info',
  });
  return ok(res, {
    ...tokens,
    user: user.toSafeJSON(),
    recoveryCodesRemaining: usedRecovery ? user.mfa.recoveryCodeHashes.length : undefined,
  });
}

/* ───────────── Sessions ───────────── */

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No active session', 'NO_SESSION');

  const result = await rotateSession(token, req);
  if (result.error) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    if (result.error === 'reused') {
      await audit(req, { action: 'auth.refresh_reuse_detected', entityType: 'User', entityId: result.userId, severity: 'critical' });
    }
    throw ApiError.unauthorized('Your session has ended. Please sign in again.', 'SESSION_ENDED');
  }

  const user = await User.findById(result.session.user).populate('role');
  if (!user || user.status !== 'active') {
    await revokeAllSessions(result.session.user, 'inactive_user');
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw ApiError.unauthorized('Your account is not active', 'ACCOUNT_INACTIVE');
  }

  const mfa = mfaSetupRequired(user) ? 'pending' : 'ok';
  res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
  return ok(res, {
    accessToken: signAccessToken(user, { sessionId: result.session._id, mfa }),
    mfaSetupRequired: mfa === 'pending',
    user: user.toSafeJSON(),
  });
}

export async function logout(req, res) {
  await revokeSessionByToken(req.cookies?.[REFRESH_COOKIE], 'logout');
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  if (req.user) await audit(req, { action: 'auth.logout', entityType: 'User', entityId: req.user._id });
  return ok(res, { loggedOut: true });
}

export async function logoutAll(req, res) {
  req.user.tokenVersion += 1;
  await req.user.save();
  await revokeAllSessions(req.user._id, 'logout_all');
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  await audit(req, { action: 'auth.logout_all', entityType: 'User', entityId: req.user._id, severity: 'notice' });
  return ok(res, { loggedOut: true });
}

export async function listMySessions(req, res) {
  const sessions = await Session.find({ user: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('userAgent createdAt lastUsedAt expiresAt')
    .sort({ createdAt: -1 })
    .lean();
  return ok(res, sessions.map((s) => ({ ...s, current: String(s._id) === req.auth?.sid })));
}

/* ───────────── Current user ───────────── */

export async function me(req, res) {
  return ok(res, { user: req.user.toSafeJSON(), mfaSetupRequired: Boolean(req.mfaPending) });
}

export async function updateProfile(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  return ok(res, { user: req.user.toSafeJSON() });
}

export async function updatePreferences(req, res) {
  const prefs = req.user.preferences || {};
  for (const [k, v] of Object.entries(req.body)) prefs[k] = v;
  req.user.preferences = prefs;
  req.user.markModified('preferences');
  await req.user.save();
  return ok(res, { preferences: req.user.preferences });
}

export async function resetPreferences(req, res) {
  req.user.preferences = {};
  await req.user.save();
  return ok(res, { preferences: req.user.preferences });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash').populate('role');
  if (!(await verifyPassword(req.body.currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }
  user.passwordHash = await hashPassword(req.body.newPassword);
  user.passwordChangedAt = new Date();
  user.tokenVersion += 1;
  await user.save();
  await revokeAllSessions(user._id, 'password_changed');
  const tokens = await issueSession(res, user, req, { mfaVerified: Boolean(user.mfa?.enabled) });
  await audit(req, { action: 'auth.password_changed', entityType: 'User', entityId: user._id, severity: 'notice' });
  sendEmailInBackground({ to: user.email, template: 'passwordChanged', data: { firstName: user.firstName } });
  return ok(res, { ...tokens, user: user.toSafeJSON() });
}

/* ───────────── MFA management ───────────── */

export async function mfaSetup(req, res) {
  const user = await User.findById(req.user._id).select('+mfa.pendingSecretEncrypted');
  if (user.mfa?.enabled) throw ApiError.conflict('Two-factor authentication is already enabled');
  const pending = await createPendingSecret(user);
  user.mfa.pendingSecretEncrypted = pending.encrypted;
  await user.save();
  return ok(res, { qrDataUrl: pending.qrDataUrl, secret: pending.secret, otpauth: pending.otpauth });
}

export async function mfaEnable(req, res) {
  const user = await User.findById(req.user._id).select('+mfa.pendingSecretEncrypted').populate('role');
  if (user.mfa?.enabled) throw ApiError.conflict('Two-factor authentication is already enabled');
  if (!user.mfa?.pendingSecretEncrypted) throw ApiError.badRequest('Start setup first');
  if (!verifyTotp(user.mfa.pendingSecretEncrypted, req.body.code)) {
    throw ApiError.badRequest('That code is not valid. Check your authenticator app and try again.');
  }
  const { codes, hashes } = await generateRecoveryCodes();
  user.mfa.secretEncrypted = user.mfa.pendingSecretEncrypted;
  user.mfa.pendingSecretEncrypted = undefined;
  user.mfa.recoveryCodeHashes = hashes;
  user.mfa.enabled = true;
  user.mfa.enabledAt = new Date();
  await user.save();

  if (req.auth?.sid) await Session.updateOne({ _id: req.auth.sid }, { mfaVerified: true });
  await audit(req, { action: 'auth.mfa_enabled', entityType: 'User', entityId: user._id, severity: 'notice' });
  sendEmailInBackground({ to: user.email, template: 'mfaChanged', data: { firstName: user.firstName, enabled: true } });

  return ok(res, {
    recoveryCodes: codes,
    accessToken: signAccessToken(user, { sessionId: req.auth?.sid, mfa: 'ok' }),
    user: user.toSafeJSON(),
  });
}

export async function mfaDisable(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash +mfa.secretEncrypted').populate('role');
  if (!user.mfa?.enabled) throw ApiError.badRequest('Two-factor authentication is not enabled');
  if (env.mfaEnforce && user.role?.requiresMfa) {
    throw ApiError.forbidden('Your role requires two-factor authentication');
  }
  if (!(await verifyPassword(req.body.password, user.passwordHash)) || !verifyTotp(user.mfa.secretEncrypted, req.body.code)) {
    throw ApiError.badRequest('Password or code is incorrect');
  }
  user.mfa = { enabled: false, recoveryCodeHashes: [] };
  await user.save();
  await audit(req, { action: 'auth.mfa_disabled', entityType: 'User', entityId: user._id, severity: 'warning' });
  sendEmailInBackground({ to: user.email, template: 'mfaChanged', data: { firstName: user.firstName, enabled: false } });
  return ok(res, { user: user.toSafeJSON() });
}

export async function regenerateRecoveryCodes(req, res) {
  const user = await User.findById(req.user._id).select('+mfa.secretEncrypted +mfa.recoveryCodeHashes');
  if (!user.mfa?.enabled) throw ApiError.badRequest('Two-factor authentication is not enabled');
  if (!verifyTotp(user.mfa.secretEncrypted, req.body.code)) throw ApiError.badRequest('That code is not valid');
  const { codes, hashes } = await generateRecoveryCodes();
  user.mfa.recoveryCodeHashes = hashes;
  await user.save();
  await audit(req, { action: 'auth.recovery_codes_regenerated', entityType: 'User', entityId: user._id, severity: 'notice' });
  return ok(res, { recoveryCodes: codes });
}

/* ───────────── Password reset & invitations ───────────── */

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email, status: 'active' });
  if (user) {
    await AuthToken.updateMany({ user: user._id, type: 'reset', usedAt: null }, { usedAt: new Date() });
    const token = randomToken();
    await AuthToken.create({
      user: user._id,
      type: 'reset',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + env.resetExpiresMinutes * 60 * 1000),
    });
    const link = `${env.clientUrls[0]}/reset-password?token=${encodeURIComponent(token)}`;
    sendEmailInBackground({
      to: user.email,
      template: 'passwordReset',
      data: { firstName: user.firstName, link, expiresMinutes: env.resetExpiresMinutes },
    });
    await audit(req, { action: 'auth.password_reset_requested', entityType: 'User', entityId: user._id });
  }
  // Same response either way — never reveal whether an account exists.
  return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
}

async function consumeToken(token, type) {
  const record = await AuthToken.findOne({ tokenHash: sha256(token), type });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('This link is invalid or has expired. Please request a new one.', 'TOKEN_INVALID');
  }
  return record;
}

export async function resetPassword(req, res) {
  const record = await consumeToken(req.body.token, 'reset');
  const user = await User.findById(record.user).select('+passwordHash');
  if (!user || user.status !== 'active') throw ApiError.badRequest('This account cannot be reset');

  user.passwordHash = await hashPassword(req.body.password);
  user.passwordChangedAt = new Date();
  user.tokenVersion += 1;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await revokeAllSessions(user._id, 'password_reset');
  await audit(req, { action: 'auth.password_reset', entityType: 'User', entityId: user._id, severity: 'notice' });
  sendEmailInBackground({ to: user.email, template: 'passwordChanged', data: { firstName: user.firstName } });
  return ok(res, { message: 'Password updated. You can now sign in.' });
}

export async function checkInvite(req, res) {
  const record = await consumeToken(String(req.params.token || ''), 'invite');
  const user = await User.findById(record.user).populate('role', 'name');
  if (!user || user.status !== 'invited') throw ApiError.badRequest('This invitation is no longer valid', 'TOKEN_INVALID');
  return ok(res, { firstName: user.firstName, email: user.email, roleName: user.role?.name, expiresAt: record.expiresAt });
}

export async function acceptInvite(req, res) {
  const record = await consumeToken(req.body.token, 'invite');
  const user = await User.findById(record.user).select('+passwordHash').populate('role');
  if (!user || user.status !== 'invited') throw ApiError.badRequest('This invitation is no longer valid', 'TOKEN_INVALID');

  user.passwordHash = await hashPassword(req.body.password);
  user.passwordChangedAt = new Date();
  user.status = 'active';
  user.lastLoginAt = new Date();
  await user.save();
  record.usedAt = new Date();
  await record.save();

  const tokens = await issueSession(res, user, req, { mfaVerified: false });
  await audit(req, { action: 'auth.invite_accepted', entityType: 'User', entityId: user._id });
  return ok(res, { ...tokens, user: user.toSafeJSON() });
}
