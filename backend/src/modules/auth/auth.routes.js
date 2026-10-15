import { Router } from 'express';
import { asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiters.js';
import * as c from './auth.controller.js';
import * as recovery from './mfaRecovery.controller.js';
import * as v from './auth.validation.js';
import { z } from 'zod';

const router = Router();
const pendingOk = authenticate({ allowMfaPending: true });

// Public
router.post('/login', authLimiter, validate(v.loginSchema), asyncHandler(c.login));
router.post('/mfa/verify', authLimiter, validate(v.mfaVerifySchema), asyncHandler(c.verifyMfaLogin));
router.post('/refresh', asyncHandler(c.refresh));
router.post('/forgot-password', passwordResetLimiter, validate(v.forgotPasswordSchema), asyncHandler(c.forgotPassword));
router.post('/reset-password', authLimiter, validate(v.resetPasswordSchema), asyncHandler(c.resetPassword));
// Lost authenticator + recovery codes → email recovery with a 24-hour waiting period
router.post('/mfa/recovery/request', passwordResetLimiter, validate(v.mfaRecoveryRequestSchema), asyncHandler(recovery.requestRecovery));
router.post('/mfa/recovery/confirm', authLimiter, validate(v.mfaRecoveryTokenSchema), asyncHandler(recovery.confirmRecovery));
router.post('/mfa/recovery/cancel', authLimiter, validate(v.mfaRecoveryTokenSchema), asyncHandler(recovery.cancelRecovery));
router.get('/invite/:token', authLimiter, asyncHandler(c.checkInvite));
router.post('/accept-invite', authLimiter, validate(v.acceptInviteSchema), asyncHandler(c.acceptInvite));

// Logout works with or without a valid access token (cookie revocation).
router.post('/logout', asyncHandler(c.logout));

// Authenticated — these allow an MFA-pending session so the user can finish setup.
router.get('/me', pendingOk, asyncHandler(c.me));
router.post('/mfa/setup', pendingOk, asyncHandler(c.mfaSetup));
router.post('/mfa/enable', pendingOk, validate(v.mfaEnableSchema), asyncHandler(c.mfaEnable));

// Authenticated — fully verified sessions only.
const full = authenticate();
router.post('/logout-all', full, asyncHandler(c.logoutAll));
router.get('/sessions', full, asyncHandler(c.listMySessions));
router.patch('/me', full, validate(v.profileSchema), asyncHandler(c.updateProfile));
router.patch('/me/preferences', full, validate(v.preferencesSchema), asyncHandler(c.updatePreferences));
router.delete('/me/preferences', full, asyncHandler(c.resetPreferences));
router.post('/change-password', full, authLimiter, validate(v.changePasswordSchema), asyncHandler(c.changePassword));
router.post('/mfa/disable', full, validate(v.mfaDisableSchema), asyncHandler(c.mfaDisable));
router.post(
  '/mfa/recovery-codes',
  full,
  validate(z.object({ code: z.string().regex(/^\d{6}$/) })),
  asyncHandler(c.regenerateRecoveryCodes),
);

export default router;
