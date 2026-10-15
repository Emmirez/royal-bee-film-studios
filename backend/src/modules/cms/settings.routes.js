import { Router } from 'express';
import { z } from 'zod';
import { SiteSettings } from '../../models/SiteSettings.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { image, seo, urlOrPath } from './cms.schemas.js';

const router = Router();
const t = (max) => z.string().trim().max(max);
const emailList = z.array(z.string().trim().toLowerCase().email()).max(20);

const settingsSchema = z
  .object({
    studioName: t(120),
    tagline: t(160),
    logo: image,
    contact: z
      .object({
        email: z.union([z.literal(''), z.string().trim().email()]),
        phone: t(40),
        whatsappDisplay: t(40),
        address: t(300),
        city: t(80),
        country: t(80),
        mapUrl: urlOrPath,
        officeHours: t(120),
      })
      .partial(),
    social: z
      .object({
        instagram: urlOrPath,
        youtube: urlOrPath,
        facebook: urlOrPath,
        x: urlOrPath,
        linkedin: urlOrPath,
        tiktok: urlOrPath,
        vimeo: urlOrPath,
      })
      .partial(),
    seo,
    footer: z.object({ blurb: t(400), copyright: t(160) }).partial(),
    search: z.object({ services: z.boolean(), productions: z.boolean(), news: z.boolean(), founder: z.boolean() }).partial(),
    notifications: z.object({ enquiryEmails: emailList, contactEmails: emailList }).partial(),
    enquiry: z
      .object({
        budgetRanges: z.array(t(60)).min(1).max(12),
        currency: z.string().trim().length(3).toUpperCase(),
        privacyNotice: t(1000),
        draftExpiryDays: z.number().int().min(1).max(60),
      })
      .partial(),
    analytics: z.object({ googleAnalyticsId: t(40) }).partial(),
  })
  .partial()
  .strict();

const workflowSchema = z.object({ contentApprovalRequired: z.boolean() });

router.get(
  '/',
  requirePermission(P.CMS_VIEW),
  asyncHandler(async (_req, res) => ok(res, await SiteSettings.getMain())),
);

/** Deep-merge one level of nested objects so partial updates don't wipe siblings. */
function applyPartial(doc, body) {
  for (const [key, value] of Object.entries(body)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && doc[key] && typeof doc[key] === 'object') {
      for (const [k, v] of Object.entries(value)) doc[key][k] = v;
      doc.markModified(key);
    } else {
      doc[key] = value;
    }
  }
}

router.patch(
  '/',
  requirePermission(P.SETTINGS_MANAGE),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await SiteSettings.getMain();
    const before = settings.toObject();
    applyPartial(settings, req.body);
    settings.updatedBy = req.user._id;
    await settings.save();
    await audit(req, { action: 'settings.updated', entityType: 'SiteSettings', before, after: settings, severity: 'notice' });
    return ok(res, settings);
  }),
);

/** Turning approvals off is a governance change — Super Admin only, always audited. */
router.patch(
  '/workflow',
  requirePermission(P.SETTINGS_MANAGE),
  validate(workflowSchema),
  asyncHandler(async (req, res) => {
    if (!req.user.role?.isSuperAdmin) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only a Super Admin can change the approval workflow' } });
    }
    const settings = await SiteSettings.getMain();
    const before = settings.workflow.toObject();
    settings.workflow.contentApprovalRequired = req.body.contentApprovalRequired;
    settings.updatedBy = req.user._id;
    await settings.save();
    await audit(req, { action: 'settings.workflow_changed', entityType: 'SiteSettings', before, after: settings.workflow, severity: 'warning' });
    return ok(res, settings.workflow);
  }),
);

export default router;
