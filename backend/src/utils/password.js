import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export const PASSWORD_RULES =
  'Password must be at least 10 characters and include a letter and a number.';

export function isStrongPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 10 || password.length > 128) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export const hashPassword = (password) => bcrypt.hash(password, ROUNDS);
export const verifyPassword = (password, hash) =>
  hash ? bcrypt.compare(password, hash) : Promise.resolve(false);
