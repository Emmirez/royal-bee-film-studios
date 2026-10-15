import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { randomToken, sha256, hashIp } from '../utils/crypto.js';
import { clientIp } from '../utils/http.js';

export const REFRESH_COOKIE = 'rb_refresh';

/**
 * Access tokens are short-lived JWTs.
 * `mfa: 'pending'` limits the token to MFA enrollment routes only.
 */
export function signAccessToken(user, { sessionId, mfa = 'ok' } = {}) {
  return jwt.sign(
    { sub: String(user._id), tv: user.tokenVersion || 0, sid: sessionId ? String(sessionId) : undefined, mfa },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpires, issuer: 'royal-bee-api', audience: 'royal-bee' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, { issuer: 'royal-bee-api', audience: 'royal-bee' });
}

/** Short-lived token proving password step passed; exchanged for a session after the MFA code. */
export function signMfaChallengeToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0, typ: 'mfa_challenge' }, env.jwtAccessSecret, {
    expiresIn: '5m',
    issuer: 'royal-bee-api',
    audience: 'royal-bee-mfa',
  });
}

export function verifyMfaChallengeToken(token) {
  const payload = jwt.verify(token, env.jwtAccessSecret, { issuer: 'royal-bee-api', audience: 'royal-bee-mfa' });
  if (payload.typ !== 'mfa_challenge') throw new Error('Wrong token type');
  return payload;
}

const refreshExpiry = () => new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);

export async function createSession(user, req, { mfaVerified = false } = {}) {
  const refreshToken = randomToken(48);
  const session = await Session.create({
    user: user._id,
    family: randomToken(16),
    tokenHash: sha256(refreshToken),
    mfaVerified,
    userAgent: req.get('user-agent')?.slice(0, 300) || '',
    ipHash: hashIp(clientIp(req)),
    expiresAt: refreshExpiry(),
  });
  return { session, refreshToken };
}

/**
 * Rotate a refresh token. If a token that was already rotated is presented
 * again (possible theft), the entire session family is revoked.
 */
export async function rotateSession(refreshToken, req) {
  const tokenHash = sha256(refreshToken);
  const existing = await Session.findOne({ tokenHash });
  if (!existing) return { error: 'invalid' };

  if (existing.revokedAt || existing.replacedBy) {
    await Session.updateMany(
      { family: existing.family, revokedAt: null },
      { revokedAt: new Date(), revokedReason: 'refresh_token_reuse' },
    );
    return { error: 'reused', userId: existing.user };
  }
  if (existing.expiresAt < new Date()) return { error: 'expired' };

  const newToken = randomToken(48);
  const next = await Session.create({
    user: existing.user,
    family: existing.family,
    tokenHash: sha256(newToken),
    mfaVerified: existing.mfaVerified,
    userAgent: req.get('user-agent')?.slice(0, 300) || existing.userAgent,
    ipHash: hashIp(clientIp(req)),
    expiresAt: refreshExpiry(),
  });
  existing.replacedBy = next.tokenHash;
  existing.revokedAt = new Date();
  existing.revokedReason = 'rotated';
  await existing.save();

  return { session: next, refreshToken: newToken };
}

export async function revokeSessionByToken(refreshToken, reason = 'logout') {
  if (!refreshToken) return;
  const s = await Session.findOne({ tokenHash: sha256(refreshToken) });
  if (s) {
    await Session.updateMany({ family: s.family, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason });
  }
}

export async function revokeAllSessions(userId, reason = 'revoked') {
  await Session.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason });
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: `${env.apiPrefix}/auth`,
    maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}
