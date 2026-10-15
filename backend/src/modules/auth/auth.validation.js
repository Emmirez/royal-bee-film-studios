import { z } from 'zod';
import { isStrongPassword, PASSWORD_RULES } from '../../utils/password.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string().refine(isStrongPassword, PASSWORD_RULES);
const totp = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const mfaVerifySchema = z.object({
  challengeToken: z.string().min(10),
  code: z.string().trim().min(6).max(20), // 6-digit TOTP or a recovery code
});

export const mfaEnableSchema = z.object({ code: totp });

export const mfaRecoveryRequestSchema = z.object({ challengeToken: z.string().min(10) });
export const mfaRecoveryTokenSchema = z.object({ token: z.string().min(20).max(200) });

export const mfaDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code: totp,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

export const preferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    sidebarCollapsed: z.boolean().optional(),
    dashboardWidgets: z.array(z.string().max(60)).max(40).optional(),
    tableColumns: z.record(z.array(z.string().max(60)).max(40)).optional(),
    savedFilters: z.record(z.any()).optional(),
    emailNotifications: z.boolean().optional(),
  })
  .strict();

export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    phone: z.string().trim().max(30).optional(),
    photo: z
      .object({ url: z.string().url().max(1000), publicId: z.string().max(300).optional(), alt: z.string().max(250).optional() })
      .optional(),
  })
  .strict();
