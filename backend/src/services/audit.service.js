import { AuditEvent } from '../models/AuditEvent.js';
import { hashIp } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { clientIp } from '../utils/http.js';

const SENSITIVE_KEYS = new Set([
  'passwordHash',
  'password',
  'secretEncrypted',
  'pendingSecretEncrypted',
  'recoveryCodeHashes',
  'tokenHash',
  'token',
]);

/** Strip secrets and Mongo internals from a snapshot before storing it. */
export function sanitizeSnapshot(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (typeof value.toObject === 'function') value = value.toObject({ depopulate: true });
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => sanitizeSnapshot(v, depth + 1));
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return String(value);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k) || k === '__v') continue;
      out[k] = sanitizeSnapshot(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Record an audit event. Never throws — audit failures are logged loudly but
 * must not break the user action that already succeeded.
 */
export async function audit(req, { action, entityType = '', entityId = '', summary = '', before, after, metadata, severity = 'info' }) {
  try {
    await AuditEvent.create({
      actor: req?.user?._id || null,
      actorEmail: req?.user?.email || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      summary,
      before: before ? sanitizeSnapshot(before) : undefined,
      after: after ? sanitizeSnapshot(after) : undefined,
      metadata,
      severity,
      ipHash: req ? hashIp(clientIp(req)) : '',
      userAgent: req?.get?.('user-agent')?.slice(0, 300) || '',
    });
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit event');
  }
}
