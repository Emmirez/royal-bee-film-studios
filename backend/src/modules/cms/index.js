import { Router } from 'express';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import heroRoutes from './hero.routes.js';
import founderRoutes from './founder.routes.js';
import founderGalleryRoutes from './founderGallery.routes.js';
import tickerRoutes from './ticker.routes.js';
import galleryRoutes from './gallery.routes.js';
import servicesRoutes from './services.routes.js';
import productionsRoutes from './productions.routes.js';
import newsRoutes from './news.routes.js';
import homeSectionsRoutes from './homeSections.routes.js';
import ctasRoutes from './ctas.routes.js';
import settingsRoutes from './settings.routes.js';
import partnerRoutes from './partner.routes.js';

/** Staff-only CMS API. Every route below also checks its own permission. */
const router = Router();
router.use(authenticate(), requireStaff);

router.use('/hero', heroRoutes);
router.use('/founder', founderRoutes);
router.use('/founder-gallery', founderGalleryRoutes);
router.use('/ticker', tickerRoutes);
router.use('/gallery', galleryRoutes);
router.use('/services', servicesRoutes);
router.use('/productions', productionsRoutes);
router.use('/news', newsRoutes);
router.use('/home-sections', homeSectionsRoutes);
router.use('/ctas', ctasRoutes);
router.use('/settings', settingsRoutes);
router.use('/partner', partnerRoutes);

export default router;
