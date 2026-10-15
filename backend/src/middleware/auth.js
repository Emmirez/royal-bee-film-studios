import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';
import { roleHasAll, roleHasAny } from '../constants/permissions.js';
import { env } from '../config/env.js';

function readBearer(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function loadUser(payload) {
  const user = await User.findById(payload.sub).populate('role');
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Your account is not active');
  if ((user.tokenVersion || 0) !== payload.tv) {
    throw ApiError.unauthorized('Your session has ended. Please sign in again.', 'SESSION_REVOKED');
  }
  return user;
}

/**
 * Require a valid access token. The user is re-loaded on every request so
 * deactivation, role changes and session revocation take effect immediately.
 * Tokens with mfa === 'pending' are rejected unless the route opts in.
 */
export function authenticate({ allowMfaPending = false } = {}) {
  return async (req, _res, next) => {
    try {
      const token = readBearer(req);
      if (!token) throw ApiError.unauthorized();
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (err) {
        throw ApiError.unauthorized(
          err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid session',
          err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        );
      }
      const user = await loadUser(payload);

      // Mandatory MFA for privileged roles.
      const mfaRequired = env.mfaEnforce && user.role?.requiresMfa;
      if (payload.mfa === 'pending' || (mfaRequired && !user.mfa?.enabled)) {
        if (!allowMfaPending) {
          throw ApiError.forbidden('Set up two-factor authentication to continue', 'MFA_SETUP_REQUIRED');
        }
        req.mfaPending = true;
      }

      req.user = user;
      req.auth = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Restrict a route to staff accounts (blocks client/talent portals). */
export function requireStaff(req, _res, next) {
  if (req.user?.accountType !== 'staff' || req.user?.role?.portal !== 'staff') {
    return next(ApiError.forbidden('Staff access only'));
  }
  return next();
}

/** Restrict a route to client portal accounts. */
export function requireClient(req, _res, next) {
  if (req.user?.accountType !== 'client' || req.user?.role?.portal !== 'client') {
    return next(ApiError.forbidden('Client portal access only'));
  }
  return next();
}

/** Restrict a route to talent portal accounts. */
export function requireTalent(req, _res, next) {
  if (req.user?.accountType !== 'talent' || req.user?.role?.portal !== 'talent') {
    return next(ApiError.forbidden('Talent portal access only'));
  }
  return next();
}

/** Require ALL listed permissions. Enforced on the server for every protected route. */
export const requirePermission = (...permissions) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roleHasAll(req.user.role, permissions)) return next(ApiError.forbidden());
  return next();
};

/** Require at least one of the listed permissions. */
export const requireAnyPermission = (...permissions) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roleHasAny(req.user.role, permissions)) return next(ApiError.forbidden());
  return next();
};

export const can = (user, permission) => roleHasAll(user?.role, [permission]);
