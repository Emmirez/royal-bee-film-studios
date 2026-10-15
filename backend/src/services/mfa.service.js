import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../utils/crypto.js';

authenticator.options = { window: 1, step: 30 };

const ISSUER = 'Royal Bee Film Studios';

export async function createPendingSecret(user) {
  const secret = authenticator.generateSecret(20);
  const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
  return { secret, encrypted: encrypt(secret), otpauth, qrDataUrl };
}

export function verifyTotp(encryptedSecret, code) {
  if (!encryptedSecret || !code) return false;
  try {
    return authenticator.check(String(code).trim(), decrypt(encryptedSecret));
  } catch {
    return false;
  }
}

/** Ten one-time recovery codes like "7F3K-9QD2". Only bcrypt hashes are stored. */
export async function generateRecoveryCodes(count = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes = Array.from({ length: count }, () => {
    const chars = Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return { codes, hashes };
}

/** Returns the index of the matching recovery code, or -1. */
export async function matchRecoveryCode(hashes = [], code = '') {
  const normalized = String(code).trim().toUpperCase();
  for (let i = 0; i < hashes.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(normalized, hashes[i])) return i;
  }
  return -1;
}
