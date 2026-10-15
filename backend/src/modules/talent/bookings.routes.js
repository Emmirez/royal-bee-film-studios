import { Router } from 'express';
import { Booking, BookingMessage, TalentDocument } from '../../models/Booking.js';
import { TalentProfile } from '../../models/TalentProfile.js';
import { CastingApplication } from '../../models/CastingCall.js';
import { Project } from '../../models/Project.js';
import { nextReference } from '../../models/Counter.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { bookingMessageOut, bookingOut, dateText, documentOut, emailTalent, talentLink } from './talent.service.js';
import * as v from './talent.validation.js';

/** Staff: talent bookings. Mounted at /bookings. */
const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = [
  { path: 'talent', populate: { path: 'user', select: 'status' } },
  { path: 'project', select: 'title reference' },
  { path: 'casting', select: 'title reference' },
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

async function load(id) {
  const booking = await Booking.findById(id).populate(POPULATE);
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

const systemMessage = (booking, user, body) => BookingMessage.create({ booking: booking._id, author: user._id, system: true, body });

const emailData = (b) => ({
  role: b.role,
  reference: b.reference,
  dates: b.endDate && String(b.endDate) !== String(b.startDate) ? `${dateText(b.startDate)} – ${dateText(b.endDate)}` : dateText(b.startDate),
  callTime: b.callTime,
  location: b.location,
  link: talentLink(`/bookings/${b._id}`),
});

router.get(
  '/',
  requirePermission(P.TALENT_VIEW),
  validate(v.listBookingQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const filter = {};
    let sort = { startDate: -1 };
    if (q.status === 'upcoming') {
      Object.assign(filter, { status: { $in: ['offered', 'confirmed'] }, $or: [{ endDate: { $gte: startOfToday() } }, { endDate: null, startDate: { $gte: startOfToday() } }] });
      sort = { startDate: 1 };
    } else if (q.status) filter.status = q.status;
    if (q.talentId) filter.talent = q.talentId;
    if (q.projectId) filter.project = q.projectId;
    if (q.awaiting === 'reply') filter.awaitingStaffReply = true;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      const talent = await TalentProfile.find({ $or: [{ firstName: rx }, { lastName: rx }, { stageName: rx }, { email: rx }] }).distinct('_id');
      const textOr = [{ role: rx }, { reference: rx }, { location: rx }, { talent: { $in: talent } }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: textOr }];
        delete filter.$or;
      } else filter.$or = textOr;
    }
    const [items, total] = await Promise.all([Booking.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit), Booking.countDocuments(filter)]);
    return ok(res, items.map((b) => bookingOut(b)), paginationMeta({ page, limit }, total));
  }),
);

/** Offer a booking to a talent (optionally from a casting application). */
router.post(
  '/',
  requirePermission(P.TALENT_MANAGE),
  validate(v.bookingSchema),
  asyncHandler(async (req, res) => {
    const { talentId, projectId, castingApplicationId, ...rest } = req.body;
    const talent = await TalentProfile.findOne({ _id: talentId, status: 'approved' });
    if (!talent) throw ApiError.validation([{ path: 'talentId', message: 'Choose someone on the approved roster' }]);
    if (projectId && !(await Project.exists({ _id: projectId }))) throw ApiError.validation([{ path: 'projectId', message: 'Choose a project from the list' }]);
    let application = null;
    if (castingApplicationId) {
      application = await CastingApplication.findOne({ _id: castingApplicationId, talent: talent._id });
      if (!application) throw ApiError.badRequest('That casting application isn’t from this talent.');
      if (application.status === 'booked') throw ApiError.badRequest('This applicant has already been booked from that casting.');
    }
    const booking = await Booking.create({
      ...rest,
      reference: await nextReference('BKG'),
      talent: talent._id,
      project: projectId || null,
      casting: application?.casting || null,
      status: 'offered',
      createdBy: req.user._id,
    });
    if (application) {
      application.status = 'booked';
      application.booking = booking._id;
      await application.save();
    }
    await systemMessage(booking, req.user, `Booking offered: ${booking.role}.`);
    await emailTalent(talent, 'bookingOffered', emailData(booking));
    await audit(req, { action: 'bookings.offered', entityType: 'Booking', entityId: booking._id, summary: `${booking.reference} · ${talent.email}` });
    return created(res, bookingOut(await load(booking._id)));
  }),
);

router.get(
  '/:id',
  requirePermission(P.TALENT_VIEW),
  asyncHandler(async (req, res) => {
    const booking = await load(req.params.id);
    const [messages, documents] = await Promise.all([
      BookingMessage.find({ booking: booking._id }).populate('author', 'firstName lastName photo').sort({ createdAt: 1 }).limit(500),
      TalentDocument.find({ booking: booking._id }).populate('uploadedBy', 'firstName lastName').sort({ createdAt: -1 }),
    ]);
    return ok(res, { booking: bookingOut(booking), messages: messages.map(bookingMessageOut), documents: documents.map(documentOut) });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.TALENT_MANAGE),
  validate(v.bookingUpdateSchema),
  asyncHandler(async (req, res) => {
    const booking = await load(req.params.id);
    if (['cancelled', 'declined', 'completed'].includes(booking.status)) throw ApiError.badRequest('This booking is closed and can’t be edited.');
    const { projectId, ...rest } = req.body;
    if (projectId !== undefined) {
      if (projectId && !(await Project.exists({ _id: projectId }))) throw ApiError.validation([{ path: 'projectId', message: 'Choose a project from the list' }]);
      booking.project = projectId || null;
    }
    Object.assign(booking, rest);
    booking.lastActivityAt = new Date();
    await booking.save();
    const keyChange = ['startDate', 'endDate', 'callTime', 'location', 'fee', 'role'].some((k) => k in rest);
    if (keyChange) {
      await systemMessage(booking, req.user, 'The booking details were updated.');
      await emailTalent(booking.talent, 'bookingUpdated', emailData(booking));
    }
    await audit(req, { action: 'bookings.updated', entityType: 'Booking', entityId: booking._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, bookingOut(await load(booking._id)));
  }),
);

router.post(
  '/:id/cancel',
  requirePermission(P.TALENT_MANAGE),
  validate(v.cancelSchema),
  asyncHandler(async (req, res) => {
    const booking = await load(req.params.id);
    if (!['offered', 'confirmed'].includes(booking.status)) throw ApiError.badRequest('Only an offered or confirmed booking can be cancelled.');
    booking.status = 'cancelled';
    booking.cancelReason = req.body.reason;
    booking.lastActivityAt = new Date();
    await booking.save();
    await systemMessage(booking, req.user, `Booking cancelled by the studio: ${req.body.reason}`);
    await emailTalent(booking.talent, 'bookingCancelled', { ...emailData(booking), reason: req.body.reason });
    await audit(req, { action: 'bookings.cancelled', entityType: 'Booking', entityId: booking._id, severity: 'notice' });
    return ok(res, bookingOut(booking));
  }),
);

router.post(
  '/:id/complete',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const booking = await load(req.params.id);
    if (booking.status !== 'confirmed') throw ApiError.badRequest('Only a confirmed booking can be marked as completed.');
    booking.status = 'completed';
    booking.lastActivityAt = new Date();
    await booking.save();
    await systemMessage(booking, req.user, 'Job completed — thank you!');
    await audit(req, { action: 'bookings.completed', entityType: 'Booking', entityId: booking._id });
    return ok(res, bookingOut(booking));
  }),
);

router.post(
  '/:id/messages',
  requirePermission(P.TALENT_MANAGE),
  validate(v.staffMessageSchema),
  asyncHandler(async (req, res) => {
    const booking = await load(req.params.id);
    const message = await BookingMessage.create({ booking: booking._id, author: req.user._id, body: req.body.body, internal: req.body.internal });
    await Booking.updateOne({ _id: booking._id }, { lastActivityAt: new Date(), ...(req.body.internal ? {} : { awaitingStaffReply: false }) });
    if (!req.body.internal) await emailTalent(booking.talent, 'bookingMessageToTalent', { ...emailData(booking), body: req.body.body, authorName: req.user.fullName });
    await message.populate('author', 'firstName lastName photo');
    return created(res, bookingMessageOut(message));
  }),
);

router.post(
  '/:id/mark-replied',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    await Booking.updateOne({ _id: req.params.id }, { awaitingStaffReply: false });
    return ok(res, { ok: true });
  }),
);

export default router;