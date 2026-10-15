import { Router } from 'express';
import { z } from 'zod';
import { TickerItem } from '../../models/TickerItem.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { buildCrudRouter } from './crudFactory.js';
import { tickerItemSchema } from './cms.schemas.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';

const router = Router();

/* Ticker behaviour (speed, direction, visibility) — stored in site settings */
const tickerSettingsSchema = z
  .object({
    enabled: z.boolean(),
    speedSeconds: z.number().int().min(10).max(300),
    direction: z.enum(['left', 'right']),
    pauseOnHover: z.boolean(),
    imageHeight: z.enum(['sm', 'md', 'lg']),
  })
  .partial();

router.get(
  '/settings',
  requirePermission(P.CMS_VIEW),
  asyncHandler(async (_req, res) => ok(res, (await SiteSettings.getMain()).ticker)),
);

router.patch(
  '/settings',
  requirePermission(P.CMS_PUBLISH),
  validate(tickerSettingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await SiteSettings.getMain();
    const before = settings.ticker.toObject();
    Object.assign(settings.ticker, req.body);
    settings.updatedBy = req.user._id;
    await settings.save();
    await audit(req, { action: 'cms.ticker.settings_updated', entityType: 'SiteSettings', before, after: settings.ticker });
    return ok(res, settings.ticker);
  }),
);

/* Ticker images: upload/add, edit, reorder, publish/unpublish, remove */
router.use(
  '/items',
  buildCrudRouter({
    Model: TickerItem,
    entity: 'TickerItem',
    workflow: 'simple',
    createSchema: tickerItemSchema,
    searchFields: ['caption'],
    defaultSort: { order: 1 },
  }),
);

export default router;
