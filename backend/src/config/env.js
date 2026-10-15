import dotenv from 'dotenv';

dotenv.config();

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
};

const list = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrls: list(process.env.CLIENT_URL || 'http://localhost:5173'),
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  logLevel: process.env.LOG_LEVEL || 'info',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royal_bee_studios',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS) || 7,
  mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY || '',
  mfaEnforce: bool(process.env.MFA_ENFORCE, true),
  inviteExpiresHours: Number(process.env.INVITE_EXPIRES_HOURS) || 72,
  resetExpiresMinutes: Number(process.env.RESET_EXPIRES_MINUTES) || 30,
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    rootFolder: process.env.CLOUDINARY_ROOT_FOLDER || 'royal-bee',
  },

  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
        fromName: process.env.EMAIL_FROM_NAME || 'Royal Bee Film Studios',
    /** Public https URL of the logo shown at the top of emails (optional). */
    logoUrl: process.env.EMAIL_LOGO_URL || '',
  },
  staffNotificationEmails: list(process.env.STAFF_NOTIFICATION_EMAILS),
};

export const integrations = {
  cloudinaryConfigured: () =>
    Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret),
  brevoConfigured: () => Boolean(env.brevo.apiKey && env.brevo.fromAddress),
};

/** Fail fast on missing critical secrets outside of tests. */
export function assertRequiredEnv() {
  const problems = [];
  if (!env.jwtAccessSecret || env.jwtAccessSecret.length < 32) {
    problems.push('JWT_ACCESS_SECRET must be set (at least 32 characters).');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(env.mfaEncryptionKey)) {
    problems.push('MFA_ENCRYPTION_KEY must be 64 hex characters.');
  }
  if (problems.length) {
    throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
  }
}
