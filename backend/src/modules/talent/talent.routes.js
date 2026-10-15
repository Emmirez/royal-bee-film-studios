import { Router } from 'express';
import { TalentProfile } from '../../models/TalentProfile.js';
import { CastingApplication } from '../../models/CastingCall.js';
import { Booking, BookingMessage, TalentDocument } from '../../models/Booking.js';
import { User } from '../../models/User.js';
import { AuthToken } from '../../models/AuthToken.js';
import { Session } from '../../models/Session.js';
import { MfaRecovery } from '../../models/MfaRecovery.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { MAX_TALENT_PHOTOS } from '../../constants/talent.js';
import { audit } from '../../services/audit.service.js';
import { privateDownloadUrl, destroyResource } from '../../services/media.service.js';
import { revokeAllSessions } from '../../services/token.service.js';
import {
  applicationOut,
  bookingOut,
  documentOut,
  emailTalent,
  getTalentRole,
  sendTalentInvite,
  talentLink,
  talentDocumentUpload,
  talentOut,
  talentPhotoUpload,
  uploadTalentDocument,
  uploadTalentPhoto,
} from './talent.service.js';
import * as v from './talent.validation.js';

/** Staff side of the talent roster. Mounted at /talent. */
const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = [
  { path: 'user', select: 'status lastLoginAt email' },
  { path: 'reviewedBy', select: 'firstName lastName' },
];

async function load(id) {
  const profile = await TalentProfile.findById(id).populate(POPULATE);
  if (!profile) throw ApiError.notFound('Talent not found');
  return profile;
}

router.get(
  '/',
  requirePermission(P.TALENT_VIEW),
  validate(v.listTalentQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q, { defaultLimit: 24 });
    const filter = {};
    if (q.status) filter.status = q.status;
    if (q.type) filter.talentTypes = q.type;
    if (q.availability) filter['availability.status'] = q.availability;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { stageName: rx }, { email: rx }, { city: rx }, { skills: rx }, { languages: rx }, { reference: rx }];
    }
    const [items, total, counts] = await Promise.all([
      TalentProfile.find(filter).populate(POPULATE).sort(q.status === 'pending' ? { createdAt: 1 } : { updatedAt: -1 }).skip(skip).limit(limit),
      TalentProfile.countDocuments(filter),
      TalentProfile.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const statusCounts = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    return ok(res, items.map((p) => talentOut(p, { summary: true })), { ...paginationMeta({ page, limit }, total), statusCounts });
  }),
);

router.get(
  '/:id',
  requirePermission(P.TALENT_VIEW),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    const [applications, bookings, documents] = await Promise.all([
      CastingApplication.find({ talent: profile._id }).populate('casting', 'title reference status').sort({ createdAt: -1 }).limit(100),
      Booking.find({ talent: profile._id }).populate('project', 'title reference').sort({ startDate: -1 }).limit(100),
      TalentDocument.find({ talent: profile._id }).populate('booking', 'reference role').populate('uploadedBy', 'firstName lastName').sort({ createdAt: -1 }),
    ]);
    return ok(res, {
      profile: talentOut(profile),
      applications: applications.map((a) => applicationOut(a)),
      bookings: bookings.map((b) => bookingOut(b)),
      documents: documents.map(documentOut),
    });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.TALENT_MANAGE),
  validate(v.staffUpdateSchema),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (req.body.email && req.body.email !== profile.email && profile.user) {
      throw ApiError.badRequest('This talent already has a portal account, so their email can’t be changed here.');
    }
    Object.assign(profile, req.body);
    await profile.save();
    await audit(req, { action: 'talent.updated', entityType: 'TalentProfile', entityId: profile._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, talentOut(await load(profile._id)));
  }),
);

/** Staff add a photo to a profile. */
router.post(
  '/:id/photos',
  requirePermission(P.TALENT_MANAGE),
  talentPhotoUpload.single('file'),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (!req.file) throw ApiError.badRequest('Choose a photo to upload');
    if (profile.photos.length >= MAX_TALENT_PHOTOS) throw ApiError.badRequest(`A profile can have up to ${MAX_TALENT_PHOTOS} photos.`);
    profile.photos.push(await uploadTalentPhoto(req.file));
    await profile.save();
    return created(res, talentOut(await load(profile._id)));
  }),
);

/* ───────── Review: approve / reject / archive ───────── */

router.post(
  '/:id/approve',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (!['pending', 'rejected'].includes(profile.status)) throw ApiError.badRequest('Only pending or rejected applications can be approved.');
    let user = await User.findOne({ email: profile.email }).select('+passwordHash');
    if (user && user.accountType !== 'talent') throw ApiError.conflict('This email already belongs to a staff or client account.');
    const role = await getTalentRole();
    if (!user) {
      user = await User.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        role: role._id,
        accountType: 'talent',
        status: 'invited',
        invitedBy: req.user._id,
      });
    } else if (user.status === 'deactivated') {
      user.status = user.passwordHash ? 'active' : 'invited';
      user.deactivatedAt = undefined;
      user.deactivatedBy = undefined;
      await user.save();
    }
    profile.user = user._id;
    profile.status = 'approved';
    profile.reviewedBy = req.user._id;
    profile.reviewedAt = new Date();
    profile.rejectionReason = '';
    await profile.save();
    const invite = user.status === 'invited' ? await sendTalentInvite(req, user) : null;
    await audit(req, { action: 'talent.approved', entityType: 'TalentProfile', entityId: profile._id, summary: profile.email });
    return ok(res, { profile: talentOut(await load(profile._id)), invite });
  }),
);

router.post(
  '/:id/resend-invite',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    const user = profile.user && (await User.findById(profile.user._id));
    if (!user || user.status !== 'invited') throw ApiError.badRequest('This talent has already set up their account.');
    const invite = await sendTalentInvite(req, user);
    await audit(req, { action: 'talent.invite_resent', entityType: 'TalentProfile', entityId: profile._id });
    return ok(res, { invite });
  }),
);

router.post(
  '/:id/reject',
  requirePermission(P.TALENT_MANAGE),
  validate(v.rejectSchema),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (profile.status !== 'pending') throw ApiError.badRequest('Only pending applications can be declined. Use Archive for roster members.');
    profile.status = 'rejected';
    profile.reviewedBy = req.user._id;
    profile.reviewedAt = new Date();
    profile.rejectionReason = req.body.reason;
    await profile.save();
    if (req.body.notify) await emailTalent(profile, 'talentApplicationDeclined', {}, { force: true });
    await audit(req, { action: 'talent.rejected', entityType: 'TalentProfile', entityId: profile._id, summary: profile.email });
    return ok(res, talentOut(await load(profile._id)));
  }),
);

/** Archive: remove from the active roster and switch off portal access (kept for records). */
router.post(
  '/:id/archive',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (profile.status !== 'approved') throw ApiError.badRequest('Only approved talent can be archived.');
    profile.status = 'archived';
    await profile.save();
    if (profile.user) {
      const user = await User.findById(profile.user._id);
      if (user) {
        user.status = 'deactivated';
        user.deactivatedAt = new Date();
        user.deactivatedBy = req.user._id;
        user.tokenVersion += 1;
        await user.save();
        await revokeAllSessions(user._id, 'deactivated');
        await AuthToken.updateMany({ user: user._id, usedAt: null }, { usedAt: new Date() });
      }
    }
    await audit(req, { action: 'talent.archived', entityType: 'TalentProfile', entityId: profile._id, severity: 'notice' });
    return ok(res, talentOut(await load(profile._id)));
  }),
);

router.post(
  '/:id/restore',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (profile.status !== 'archived') throw ApiError.badRequest('This talent is not archived.');
    profile.status = 'approved';
    await profile.save();
    if (profile.user) {
      const user = await User.findById(profile.user._id).select('+passwordHash');
      if (user && user.status === 'deactivated') {
        user.status = user.passwordHash ? 'active' : 'invited';
        user.deactivatedAt = undefined;
        user.deactivatedBy = undefined;
        await user.save();
      }
    }
    await audit(req, { action: 'talent.restored', entityType: 'TalentProfile', entityId: profile._id, severity: 'notice' });
    return ok(res, talentOut(await load(profile._id)));
  }),
);

/**
 * Delete for good. Allowed for:
 *  - applications that were never approved (spam / declined), and
 *  - archived roster members — removes their portal account, bookings and booking
 *    messages, casting applications, private documents and photos.
 * Approved talent must be archived first, so deleting is always a deliberate two-step action.
 */
router.delete(
  '/:id',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    const isApplication = ['pending', 'rejected'].includes(profile.status) && !profile.user;
    if (!isApplication && profile.status !== 'archived') throw ApiError.badRequest('Archive this talent first, then you can delete them.');

    const snapshot = { name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email, reference: profile.reference };
    const [bookings, documents] = await Promise.all([Booking.find({ talent: profile._id }).select('_id'), TalentDocument.find({ talent: profile._id })]);
    const bookingIds = bookings.map((b) => b._id);

    // Remove files from Cloudinary (best effort — a missing file shouldn't block the delete)
    await Promise.all([
      ...profile.photos.filter((p) => p.publicId).map((p) => destroyResource(p.publicId).catch(() => null)),
      ...documents.map((d) => destroyResource(d.file.publicId, d.file.resourceType, 'authenticated').catch(() => null)),
    ]);

    await Promise.all([
      BookingMessage.deleteMany({ booking: { $in: bookingIds } }),
      Booking.deleteMany({ talent: profile._id }),
      CastingApplication.deleteMany({ talent: profile._id }),
      TalentDocument.deleteMany({ talent: profile._id }),
    ]);

    // Their talent portal account (never touches staff or client accounts)
    if (profile.user) {
      const user = await User.findOne({ _id: profile.user._id, accountType: 'talent' });
      if (user) {
        await Promise.all([Session.deleteMany({ user: user._id }), AuthToken.deleteMany({ user: user._id }), MfaRecovery.deleteMany({ user: user._id })]);
        await user.deleteOne();
      }
    }

    await profile.deleteOne();
    await audit(req, {
      action: isApplication ? 'talent.application_deleted' : 'talent.deleted',
      entityType: 'TalentProfile',
      entityId: profile._id,
      summary: profile.email,
      metadata: { ...snapshot, bookings: bookingIds.length, documents: documents.length },
      severity: isApplication ? 'notice' : 'warning',
    });
    return ok(res, { deleted: true });
  }),
);

/* ───────── Private documents ───────── */

router.post(
  '/:id/documents',
  requirePermission(P.TALENT_MANAGE),
  talentDocumentUpload.single('file'),
  asyncHandler(async (req, res) => {
    const profile = await load(req.params.id);
    if (!req.file) throw ApiError.badRequest('Choose a file to upload');
    const fields = v.documentFieldsSchema.parse(req.body || {});
    if (fields.bookingId && !(await Booking.exists({ _id: fields.bookingId, talent: profile._id }))) throw ApiError.badRequest('That booking isn’t for this talent.');
    const doc = await TalentDocument.create({
      talent: profile._id,
      booking: fields.bookingId || null,
      kind: fields.kind,
      title: fields.title,
      file: await uploadTalentDocument(req.file),
      fromTalent: false,
      uploadedBy: req.user._id,
    });
    if (profile.user) await emailTalent(profile, 'talentDocumentShared', { title: doc.title || doc.file.name, link: talentLink('/documents') });
    await audit(req, { action: 'talent.document_uploaded', entityType: 'TalentProfile', entityId: profile._id, summary: doc.file.name });
    await doc.populate([{ path: 'booking', select: 'reference role' }, { path: 'uploadedBy', select: 'firstName lastName' }]);
    return created(res, documentOut(doc));
  }),
);

router.get(
  '/:id/documents/:docId/download',
  requirePermission(P.TALENT_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await TalentDocument.findOne({ _id: req.params.docId, talent: req.params.id });
    if (!doc) throw ApiError.notFound('Document not found');
    const url = privateDownloadUrl(doc.file.publicId, { resourceType: doc.file.resourceType, format: doc.file.format });
    await audit(req, { action: 'talent.document_downloaded', entityType: 'TalentProfile', entityId: req.params.id, summary: doc.file.name });
    return ok(res, { url, expiresInSeconds: 300 });
  }),
);

router.delete(
  '/:id/documents/:docId',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const doc = await TalentDocument.findOneAndDelete({ _id: req.params.docId, talent: req.params.id });
    if (!doc) throw ApiError.notFound('Document not found');
    await destroyResource(doc.file.publicId, doc.file.resourceType, 'authenticated').catch(() => null);
    await audit(req, { action: 'talent.document_deleted', entityType: 'TalentProfile', entityId: req.params.id, summary: doc.file.name, severity: 'notice' });
    return ok(res, { deleted: true });
  }),
);

export default router;