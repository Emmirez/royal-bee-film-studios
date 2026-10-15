import { Router } from 'express';
import { AuditEvent } from '../../models/AuditEvent.js';
import { EmailLog } from '../../models/EmailLog.js';
import { Enquiry } from '../../models/Enquiry.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { Service } from '../../models/Service.js';
import { Production } from '../../models/Production.js';
import { NewsPost } from '../../models/NewsPost.js';
import { HomeSection } from '../../models/HomeSection.js';
import { Hero } from '../../models/Hero.js';
import { Founder } from '../../models/Founder.js';
import { PartnerPage } from '../../models/PartnerPage.js';
import { MfaRecovery } from '../../models/MfaRecovery.js';
import { Project } from '../../models/Project.js';
import { Deliverable } from '../../models/Deliverable.js';
import { Invoice } from '../../models/Invoice.js';
import { TalentProfile } from '../../models/TalentProfile.js';
import { CastingApplication } from '../../models/CastingCall.js';
import { Booking } from '../../models/Booking.js';
import { SearchStat } from '../../models/SearchLog.js';
import { asyncHandler, ok, parsePagination, paginationMeta } from '../../utils/http.js';
import { authenticate, requireStaff, requirePermission, can } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { integrations } from '../../config/env.js';
import { testCloudinaryConnection } from '../../services/media.service.js';
import { testBrevoConnection } from '../../services/email.service.js';
import { audit } from '../../services/audit.service.js';
import { dbState } from '../../config/db.js';

const router = Router();
router.use(authenticate(), requireStaff);

/** Dashboard overview — each block only appears if the user may see it. */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const out = {};
    if (can(req.user, P.CMS_VIEW)) {
      const statusCount = async (Model) => {
        const rows = await Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        return Object.fromEntries(rows.map((r) => [r._id, r.count]));
      };
      const [services, productions, news, sections, hero, founder] = await Promise.all([
        statusCount(Service),
        statusCount(Production),
        statusCount(NewsPost),
        statusCount(HomeSection),
        Hero.findOne({ key: 'main' }).select('reviewStatus hasUnpublishedChanges publishedAt').lean(),
        Founder.findOne({ key: 'main' }).select('reviewStatus hasUnpublishedChanges publishedAt').lean(),
      ]);
      const awaitingReview = ['services', 'productions', 'news', 'sections'].reduce(
        (sum, k) => sum + ({ services, productions, news, sections }[k].in_review || 0),
        0,
      ) + [hero, founder].filter((s) => s?.reviewStatus === 'in_review').length;
      out.content = { services, productions, news, sections, hero, founder, awaitingReview };
    }
    if (can(req.user, P.ENQUIRIES_VIEW)) {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const [newEnquiries, unassigned, last30, unreadMessages, recent] = await Promise.all([
        Enquiry.countDocuments({ status: 'new' }),
        Enquiry.countDocuments({ assignedTo: null, status: { $in: ['new', 'contacted', 'qualified'] } }),
        Enquiry.countDocuments({ createdAt: { $gte: since } }),
        ContactMessage.countDocuments({ status: 'new' }),
        Enquiry.find().sort({ createdAt: -1 }).limit(5).select('reference contact.name serviceTitle status createdAt').lean(),
      ]);
      out.enquiries = { new: newEnquiries, unassigned, last30Days: last30, unreadMessages, recent };
    }
    if (can(req.user, P.INTEGRATIONS_MANAGE)) {
      out.system = {
        database: dbState(),
        cloudinary: integrations.cloudinaryConfigured() ? 'configured' : 'not_configured',
        brevo: integrations.brevoConfigured() ? 'configured' : 'not_configured',
        failedEmails24h: await EmailLog.countDocuments({ status: 'failed', createdAt: { $gte: new Date(Date.now() - 864e5) } }),
      };
    }
    return ok(res, out);
  }),
);

/* ───────── Notification bell ───────── */

/**
 * Things that need attention, for the bell in the admin top bar.
 * Each item only appears if the user has permission and its count is above zero.
 */
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const items = [];

    if (can(req.user, P.ENQUIRIES_VIEW)) {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const [newProjects, newPartnerships, unreadMessages, followUps] = await Promise.all([
        Enquiry.countDocuments({ status: 'new', kind: { $ne: 'partnership' } }),
        Enquiry.countDocuments({ status: 'new', kind: 'partnership' }),
        ContactMessage.countDocuments({ status: 'new' }),
        Enquiry.countDocuments({ followUpAt: { $ne: null, $lte: endOfToday }, status: { $nin: ['converted', 'closed', 'spam'] } }),
      ]);
      items.push(
        { key: 'enquiries', type: 'enquiry', count: newProjects, label: newProjects === 1 ? 'New project enquiry' : 'New project enquiries', href: '/admin/enquiries?status=new&kind=project' },
        { key: 'partnerships', type: 'partnership', count: newPartnerships, label: newPartnerships === 1 ? 'New partnership proposal' : 'New partnership proposals', href: '/admin/enquiries?status=new&kind=partnership' },
        { key: 'messages', type: 'message', count: unreadMessages, label: unreadMessages === 1 ? 'Unread message' : 'Unread messages', href: '/admin/messages' },
        { key: 'followups', type: 'followup', count: followUps, label: followUps === 1 ? 'Follow-up due today' : 'Follow-ups due today', href: '/admin/enquiries' },
      );
    }

    if (can(req.user, P.CMS_APPROVE)) {
      const inReview = (Model) => Model.countDocuments({ status: 'in_review' });
      const singleton = async (Model) => ((await Model.findOne({ key: 'main' }).select('reviewStatus').lean())?.reviewStatus === 'in_review' ? 1 : 0);
      const [services, productions, news, sections, hero, founder, partner] = await Promise.all([
        inReview(Service),
        inReview(Production),
        inReview(NewsPost),
        inReview(HomeSection),
        singleton(Hero),
        singleton(Founder),
        singleton(PartnerPage),
      ]);
      const review = (key, count, what, href) =>
        items.push({ key: `review-${key}`, type: 'review', count, label: `${what} waiting for review`, href });
      review('hero', hero, 'Hero video', '/admin/website/hero');
      review('founder', founder, 'Founder profile', '/admin/website/founder');
      review('partner', partner, 'Partner page', '/admin/website/partner');
      review('sections', sections, sections === 1 ? 'Homepage section' : 'Homepage sections', '/admin/website/homepage');
      review('news', news, news === 1 ? 'News article' : 'News articles', '/admin/website/news');
      review('productions', productions, productions === 1 ? 'Production' : 'Productions', '/admin/website/productions');
      review('services', services, services === 1 ? 'Service' : 'Services', '/admin/website/services');
    }

        if (can(req.user, P.PROJECTS_VIEW)) {
      const [awaitingReply, changeRequests] = await Promise.all([
        Project.countDocuments({ awaitingStaffReply: true }),
        Deliverable.countDocuments({ status: 'changes_requested' }),
      ]);
      items.push(
        { key: 'client-messages', type: 'client', count: awaitingReply, label: awaitingReply === 1 ? 'Client message awaiting reply' : 'Client messages awaiting reply', href: '/admin/projects?awaiting=reply' },
        { key: 'client-changes', type: 'client', count: changeRequests, label: changeRequests === 1 ? 'Change request from a client' : 'Change requests from clients', href: '/admin/projects?awaiting=changes' },
      );
    }

     if (can(req.user, P.INVOICES_VIEW)) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const [overdue, accepted] = await Promise.all([
        Invoice.countDocuments({ kind: 'invoice', status: { $in: ['sent', 'part_paid'] }, dueDate: { $lt: startOfToday } }),
        Invoice.countDocuments({ kind: 'quote', status: 'accepted' }),
      ]);
      items.push(
        { key: 'invoices-overdue', type: 'invoice', count: overdue, label: overdue === 1 ? 'Overdue invoice' : 'Overdue invoices', href: '/admin/invoices?status=overdue' },
        { key: 'quotes-accepted', type: 'invoice', count: accepted, label: accepted === 1 ? 'Accepted quote to invoice' : 'Accepted quotes to invoice', href: '/admin/invoices?kind=quote&status=accepted' },
      );
    }

    if (can(req.user, P.TALENT_VIEW)) {
      const [applications, castingApps, bookingReplies, bookingAnswers] = await Promise.all([
        TalentProfile.countDocuments({ status: 'pending' }),
        CastingApplication.countDocuments({ status: 'applied' }),
        Booking.countDocuments({ awaitingStaffReply: true }),
        Booking.countDocuments({ status: 'declined', updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
      ]);
      items.push(
        { key: 'talent-applications', type: 'talent', count: applications, label: applications === 1 ? 'Talent application to review' : 'Talent applications to review', href: '/admin/talent?status=pending' },
        { key: 'casting-applications', type: 'talent', count: castingApps, label: castingApps === 1 ? 'New casting application' : 'New casting applications', href: '/admin/castings' },
        { key: 'booking-messages', type: 'talent', count: bookingReplies, label: bookingReplies === 1 ? 'Talent message awaiting reply' : 'Talent messages awaiting reply', href: '/admin/bookings?awaiting=reply' },
        { key: 'booking-declined', type: 'talent', count: bookingAnswers, label: bookingAnswers === 1 ? 'Booking declined this week' : 'Bookings declined this week', href: '/admin/bookings?status=declined' },
      );
    }

    if (req.user.role?.isSuperAdmin) {
      const recoveries = await MfaRecovery.countDocuments({ status: 'waiting' });
      items.unshift({ key: 'mfa-recovery', type: 'security', count: recoveries, label: recoveries === 1 ? 'Two-factor recovery in progress' : 'Two-factor recoveries in progress', href: '/admin/audit' });
    }

    const active = items.filter((i) => i.count > 0);
    return ok(res, { total: active.reduce((sum, i) => sum + i.count, 0), items: active });
  }),
);

/* ───────── Integrations ───────── */

router.get(
  '/integrations',
  requirePermission(P.INTEGRATIONS_MANAGE),
  asyncHandler(async (_req, res) => {
    const [lastEmail, lastFailedEmail] = await Promise.all([
      EmailLog.findOne({ status: 'sent' }).sort({ createdAt: -1 }).select('createdAt template').lean(),
      EmailLog.findOne({ status: 'failed' }).sort({ createdAt: -1 }).select('createdAt template error').lean(),
    ]);
    return ok(res, [
      {
        key: 'cloudinary',
        name: 'Cloudinary',
        purpose: 'Image and video uploads, optimization and delivery',
        configured: integrations.cloudinaryConfigured(),
        setup: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server environment.',
      },
      {
        key: 'brevo',
        name: 'Brevo',
        purpose: 'Transactional email (invitations, password resets, enquiry confirmations)',
        configured: integrations.brevoConfigured(),
        lastSuccess: lastEmail?.createdAt || null,
        lastFailure: lastFailedEmail ? { at: lastFailedEmail.createdAt, template: lastFailedEmail.template, error: lastFailedEmail.error } : null,
        setup: 'Set BREVO_API_KEY and EMAIL_FROM_ADDRESS (a verified sender on your domain with SPF, DKIM and DMARC).',
      },
    ]);
  }),
);

router.post(
  '/integrations/:key/test',
  requirePermission(P.INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const tests = { cloudinary: testCloudinaryConnection, brevo: testBrevoConnection };
    const run = tests[req.params.key];
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown integration' } });
    const result = await run();
    await audit(req, { action: 'integrations.tested', entityType: 'Integration', entityId: req.params.key, metadata: result });
    return ok(res, result);
  }),
);

router.get(
  '/emails',
  requirePermission(P.INTEGRATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = req.query.status ? { status: String(req.query.status) } : {};
    const [items, total] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmailLog.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta({ page, limit }, total));
  }),
);

/* ───────── Audit trail (read-only) ───────── */

router.get(
  '/audit',
  requirePermission(P.AUDIT_VIEW),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const filter = {};
    if (req.query.action) filter.action = new RegExp(`^${String(req.query.action).replace(/[^a-z0-9_.]/gi, '')}`);
    if (req.query.entityType) filter.entityType = String(req.query.entityType);
    if (req.query.entityId) filter.entityId = String(req.query.entityId);
    if (req.query.actor && /^[0-9a-fA-F]{24}$/.test(req.query.actor)) filter.actor = req.query.actor;
    if (req.query.severity) filter.severity = String(req.query.severity);
    const [items, total] = await Promise.all([
      AuditEvent.find(filter).populate('actor', 'firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditEvent.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta({ page, limit }, total));
  }),
);

/* ───────── Website analytics (aggregate) ───────── */

router.get(
  '/analytics/search',
  requirePermission(P.ANALYTICS_VIEW),
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const [top, zero] = await Promise.all([
      SearchStat.aggregate([
        { $match: { date: { $gte: since } } },
        { $group: { _id: '$term', count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]),
      SearchStat.aggregate([
        { $match: { date: { $gte: since }, zeroResultCount: { $gt: 0 } } },
        { $group: { _id: '$term', count: { $sum: '$zeroResultCount' } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]),
    ]);
    return ok(res, {
      days,
      topSearches: top.map((t) => ({ term: t._id, count: t.count })),
      noResults: zero.map((t) => ({ term: t._id, count: t.count })),
    });
  }),
);

export default router;
