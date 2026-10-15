import crypto from 'node:crypto';
import { env } from '../config/env.js';

/** URL-safe random token (returned to the user; only its hash is stored). */
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/** Hash an IP for privacy-conscious logging (not reversible). */
export const hashIp = (ip) => (ip ? sha256(`${ip}:${env.jwtAccessSecret.slice(0, 8)}`).slice(0, 24) : '');

function key() {
  return Buffer.from(env.mfaEncryptionKey, 'hex');
}

/** AES-256-GCM encryption for small secrets stored at rest (e.g. MFA secrets). */
export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload) {
  const [iv, tag, enc] = String(payload).split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};
