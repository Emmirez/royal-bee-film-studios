import { Router } from 'express';
import { TalentProfile } from '../../models/TalentProfile.js';
import { CastingCall, CastingApplication } from '../../models/CastingCall.js';
import { Booking, BookingMessage, TalentDocument } from '../../models/Booking.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireTalent } from '../../middleware/auth.js';
import { MAX_TALENT_PHOTOS } from '../../constants/talent.js';
import { audit } from '../../services/audit.service.js';
import { destroyResource, privateDownloadUrl } from '../../services/media.service.js';
import {
  adminLink,
  applicationOut,
  bookingMessageOut,
  bookingOut,
  castingOut,
  displayName,
  documentOut,
  emailStaff,
  talentDocumentUpload,
  talentOut,
  talentPhotoUpload,
  uploadTalentDocument,
  uploadTalentPhoto,
} from './talent.service.js';
import * as v from './talent.validation.js';

/** Talent portal API. Mounted at /talent-portal. A talent only ever sees their own data. */
const router = Router();
router.use(authenticate(), requireTalent);

/** The signed-in talent's profile (must be approved). */
router.use(
  asyncHandler(async (req, _res, next) => {
    const profile = await TalentProfile.findOne({ user: req.user._id, status: 'approved' });
    if (!profile) throw ApiError.forbidden('Your talent profile is not active. Please contact the studio.');
    req.talent = profile;
    next();
  }),
);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const openCastingFilter = () => ({ status: 'open', $or: [{ applyBy: null }, { applyBy: { $gte: startOfToday() } }] });

/* ───────── Dashboard ───────── */

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const t = req.talent;
    const [openCastings, myApplications, upcoming, offers] = await Promise.all([
      CastingCall.find(openCastingFilter()).select('talentTypes').lean(),
      CastingApplication.find({ talent: t._id }).select('casting status').lean(),
      Booking.find({ talent: t._id, status: 'confirmed', $or: [{ endDate: { $gte: startOfToday() } }, { endDate: null, startDate: { $gte: startOfToday() } }] }).populate('project', 'title reference').sort({ startDate: 1 }).limit(5),
      Booking.countDocuments({ talent: t._id, status: 'offered' }),
    ]);
    const applied = new Set(myApplications.map((a) => String(a.casting)));
    const matching = openCastings.filter((c) => !applied.has(String(c._id)) && (!c.talentTypes.length || c.talentTypes.some((x) => t.talentTypes.includes(x)))).length;
    const checks = [
      { key: 'photos', label: 'Add at least 3 photos', done: t.photos.length >= 3 },
      { key: 'bio', label: 'Write a short bio', done: t.bio.length >= 40 },
      { key: 'reel', label: 'Add a showreel link', done: t.showreels.length > 0 },
      { key: 'details', label: 'Add height and playing age', done: Boolean(t.heightCm && t.playingAgeMin) },
      { key: 'skills', label: 'List your skills and languages', done: t.skills.length > 0 && t.languages.length > 0 },
    ];
    return ok(res, {
      profile: talentOut(t, { forTalent: true }),
      completeness: { percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), checks },
      matchingCastings: matching,
      pendingOffers: offers,
      upcoming: upcoming.map((b) => bookingOut(b, { forTalent: true })),
    });
  }),
);

/* ───────── Profile ───────── */

router.get('/profile', asyncHandler(async (req, res) => ok(res, talentOut(req.talent, { forTalent: true }))));

router.patch(
  '/profile',
  validate(v.selfUpdateSchema),
  asyncHandler(async (req, res) => {
    const t = req.talent;
    if (req.body.photos) {
      // Photos can only be reordered or removed here — never swapped for outside URLs.
      const known = new Map(t.photos.map((p) => [p.publicId || p.url, p]));
      const next = req.body.photos.map((p) => known.get(p.publicId || p.url)).filter(Boolean);
      const removed = t.photos.filter((p) => !next.includes(p));
      t.photos = next.map((p, i) => ({ ...p.toObject(), alt: req.body.photos[i]?.alt ?? p.alt }));
      await Promise.all(removed.filter((p) => p.publicId).map((p) => destroyResource(p.publicId).catch(() => null)));
    }
    const { photos, ...rest } = req.body;
    Object.assign(t, rest);
    await t.save();
    return ok(res, talentOut(t, { forTalent: true }));
  }),
);

router.post(
  '/profile/photos',
  talentPhotoUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a photo to upload');
    if (req.talent.photos.length >= MAX_TALENT_PHOTOS) throw ApiError.badRequest(`You can have up to ${MAX_TALENT_PHOTOS} photos. Remove one first.`);
    req.talent.photos.push(await uploadTalentPhoto(req.file));
    await req.talent.save();
    return created(res, talentOut(req.talent, { forTalent: true }));
  }),
);

/* ───────── Casting calls ───────── */

router.get(
  '/castings',
  asyncHandler(async (req, res) => {
    const t = req.talent;
    const [castings, applications] = await Promise.all([
      CastingCall.find(openCastingFilter()).populate('project', 'title reference').sort({ publishedAt: -1 }).limit(100),
      CastingApplication.find({ talent: t._id }).populate('casting', 'title reference status').sort({ createdAt: -1 }).limit(100),
    ]);
    const mine = new Map(applications.map((a) => [String(a.casting?._id), a]));
    return ok(res, {
      open: castings.map((c) =>
        castingOut(c, {
          matchesYou: !c.talentTypes.length || c.talentTypes.some((x) => t.talentTypes.includes(x)),
          myApplication: mine.has(String(c._id)) ? applicationOut(mine.get(String(c._id)), { forTalent: true }) : null,
        }),
      ),
      myApplications: applications.map((a) => applicationOut(a, { forTalent: true })),
    });
  }),
);

router.get(
  '/castings/:id',
  asyncHandler(async (req, res) => {
    const application = await CastingApplication.findOne({ casting: req.params.id, talent: req.talent._id });
    // Closed castings stay visible only to people who applied.
    const casting = await CastingCall.findOne({ _id: req.params.id, ...(application ? { status: { $ne: 'draft' } } : { status: 'open' }) }).populate('project', 'title reference');
    if (!casting) throw ApiError.notFound('This casting call is no longer open.');
    return ok(res, castingOut(casting, { myApplication: application ? applicationOut(application, { forTalent: true }) : null }));
  }),
);

router.post(
  '/castings/:id/apply',
  validate(v.applyToCastingSchema),
  asyncHandler(async (req, res) => {
    const casting = await CastingCall.findOne({ _id: req.params.id, ...openCastingFilter() });
    if (!casting) throw ApiError.badRequest('This casting call is closed.');
    let application = await CastingApplication.findOne({ casting: casting._id, talent: req.talent._id });
    if (application && application.status !== 'withdrawn') throw ApiError.conflict('You’ve already applied to this casting.');
    if (application) {
      application.status = 'applied';
      application.note = req.body.note;
      await application.save();
    } else {
      application = await CastingApplication.create({ casting: casting._id, talent: req.talent._id, note: req.body.note });
    }
    await emailStaff('castingApplicationStaffAlert', { name: displayName(req.talent), title: casting.title, note: req.body.note, link: adminLink(`/castings/${casting._id}`) });
    await audit(req, { action: 'portal.casting_applied', entityType: 'CastingCall', entityId: casting._id });
    return created(res, applicationOut(application, { forTalent: true }));
  }),
);

router.post(
  '/castings/:id/withdraw',
  asyncHandler(async (req, res) => {
    const application = await CastingApplication.findOne({ casting: req.params.id, talent: req.talent._id });
    if (!application || !['applied', 'shortlisted'].includes(application.status)) throw ApiError.badRequest('There’s no open application to withdraw.');
    application.status = 'withdrawn';
    await application.save();
    return ok(res, applicationOut(application, { forTalent: true }));
  }),
);

/* ───────── Bookings ───────── */

async function ownBooking(req) {
  const booking = await Booking.findOne({ _id: req.params.id, talent: req.talent._id }).populate([
    { path: 'project', select: 'title reference manager' },
    { path: 'casting', select: 'title' },
  ]);
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ talent: req.talent._id }).populate('project', 'title reference').sort({ startDate: -1 }).limit(200);
    return ok(res, bookings.map((b) => bookingOut(b, { forTalent: true })));
  }),
);

router.get(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const booking = await ownBooking(req);
    const [messages, documents] = await Promise.all([
      BookingMessage.find({ booking: booking._id, internal: false }).populate('author', 'firstName lastName photo').sort({ createdAt: 1 }).limit(500),
      TalentDocument.find({ booking: booking._id, talent: req.talent._id }).sort({ createdAt: -1 }),
    ]);
    return ok(res, { booking: bookingOut(booking, { forTalent: true }), messages: messages.map(bookingMessageOut), documents: documents.map(documentOut) });
  }),
);

router.post(
  '/bookings/:id/respond',
  validate(v.respondSchema),
  asyncHandler(async (req, res) => {
    const booking = await ownBooking(req);
    if (booking.status !== 'offered') throw ApiError.badRequest('You’ve already answered this booking.');
    const { decision, reason } = req.body;
    booking.status = decision;
    booking.respondedAt = new Date();
    booking.declineReason = decision === 'declined' ? reason : '';
    booking.lastActivityAt = new Date();
    await booking.save();
    await BookingMessage.create({
      booking: booking._id,
      author: req.user._id,
      fromTalent: true,
      system: true,
      body: decision === 'confirmed' ? `${displayName(req.talent)} confirmed the booking.` : `${displayName(req.talent)} declined the booking${reason ? `: “${reason}”` : '.'}`,
    });
    await emailStaff(
      'bookingResponseAlert',
      { name: displayName(req.talent), role: booking.role, reference: booking.reference, confirmed: decision === 'confirmed', reason, link: adminLink(`/bookings/${booking._id}`) },
      booking.project,
    );
    await audit(req, { action: `portal.booking_${decision}`, entityType: 'Booking', entityId: booking._id });
    return ok(res, bookingOut(booking, { forTalent: true }));
  }),
);

router.post(
  '/bookings/:id/messages',
  validate(v.talentMessageSchema),
  asyncHandler(async (req, res) => {
    const booking = await ownBooking(req);
    const message = await BookingMessage.create({ booking: booking._id, author: req.user._id, fromTalent: true, body: req.body.body });
    await Booking.updateOne({ _id: booking._id }, { lastActivityAt: new Date(), awaitingStaffReply: true });
    await emailStaff('bookingMessageAlert', { name: displayName(req.talent), role: booking.role, reference: booking.reference, body: req.body.body, link: adminLink(`/bookings/${booking._id}`) }, booking.project);
    await message.populate('author', 'firstName lastName photo');
    return created(res, bookingMessageOut(message));
  }),
);

/* ───────── Documents ───────── */

router.get(
  '/documents',
  asyncHandler(async (req, res) => {
    const docs = await TalentDocument.find({ talent: req.talent._id }).populate('booking', 'reference role').sort({ createdAt: -1 });
    return ok(res, docs.map(documentOut));
  }),
);

router.post(
  '/documents',
  talentDocumentUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a file to upload');
    const fields = v.documentFieldsSchema.parse(req.body || {});
    if (fields.bookingId && !(await Booking.exists({ _id: fields.bookingId, talent: req.talent._id }))) throw ApiError.badRequest('Choose one of your bookings.');
    const doc = await TalentDocument.create({
      talent: req.talent._id,
      booking: fields.bookingId || null,
      kind: fields.kind,
      title: fields.title,
      file: await uploadTalentDocument(req.file),
      fromTalent: true,
      uploadedBy: req.user._id,
    });
    await emailStaff('talentDocumentAlert', { name: displayName(req.talent), title: doc.title || doc.file.name, link: adminLink(`/talent/${req.talent._id}`) });
    await audit(req, { action: 'portal.document_uploaded', entityType: 'TalentProfile', entityId: req.talent._id, summary: doc.file.name });
    await doc.populate('booking', 'reference role');
    return created(res, documentOut(doc));
  }),
);

router.get(
  '/documents/:id/download',
  asyncHandler(async (req, res) => {
    const doc = await TalentDocument.findOne({ _id: req.params.id, talent: req.talent._id });
    if (!doc) throw ApiError.notFound('Document not found');
    return ok(res, { url: privateDownloadUrl(doc.file.publicId, { resourceType: doc.file.resourceType, format: doc.file.format }), expiresInSeconds: 300 });
  }),
);

/** Talent can remove files they uploaded themselves (not ones the studio shared). */
router.delete(
  '/documents/:id',
  asyncHandler(async (req, res) => {
    const doc = await TalentDocument.findOne({ _id: req.params.id, talent: req.talent._id });
    if (!doc) throw ApiError.notFound('Document not found');
    if (!doc.fromTalent) throw ApiError.forbidden('Files shared by the studio can only be removed by the studio.');
    await doc.deleteOne();
    await destroyResource(doc.file.publicId, doc.file.resourceType, 'authenticated').catch(() => null);
    return ok(res, { deleted: true });
  }),
);

export default router;