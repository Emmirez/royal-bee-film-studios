import { Router } from 'express';
import { ok } from './utils/http.js';
import { dbState } from './config/db.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import cmsRoutes from './modules/cms/index.js';
import mediaRoutes from './modules/media/media.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import publicEnquiryRoutes from './modules/enquiries/publicEnquiries.routes.js';
import enquiriesRoutes from './modules/enquiries/enquiries.routes.js';
import contactMessagesRoutes from './modules/enquiries/contactMessages.routes.js';
import contactsRoutes from './modules/crm/contacts.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import clientsRoutes from './modules/clients/clients.routes.js';
import portalRoutes from './modules/portal/portal.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import portalInvoicesRoutes from './modules/invoices/portalInvoices.routes.js';
import talentPublicRoutes from './modules/talent/talentPublic.routes.js';
import talentRoutes from './modules/talent/talent.routes.js';
import castingsRoutes from './modules/talent/castings.routes.js';
import bookingsRoutes from './modules/talent/bookings.routes.js';
import talentPortalRoutes from './modules/talent/talentPortal.routes.js';

const router = Router();

/** Liveness/readiness — no sensitive diagnostics. */
router.get('/health', (_req, res) => {
  const db = dbState();
  const healthy = db === 'connected';
  return ok(res, { status: healthy ? 'ok' : 'degraded', database: db, time: new Date().toISOString() }, undefined, healthy ? 200 : 503);
});

// Public website (no login)
router.use('/public', publicRoutes);
router.use('/public', publicEnquiryRoutes);
router.use('/public/talent', talentPublicRoutes);

// Authentication
router.use('/auth', authRoutes);

// Staff application
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/cms', cmsRoutes);
router.use('/media', mediaRoutes);
router.use('/enquiries', enquiriesRoutes);
router.use('/contact-messages', contactMessagesRoutes);
router.use('/crm/contacts', contactsRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectsRoutes);
router.use('/clients', clientsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/talent', talentRoutes);
router.use('/castings', castingsRoutes);
router.use('/bookings', bookingsRoutes);

// Client portal
router.use('/portal/invoices', portalInvoicesRoutes);
router.use('/portal', portalRoutes);

// Talent portal
router.use('/talent-portal', talentPortalRoutes);

export default router;
