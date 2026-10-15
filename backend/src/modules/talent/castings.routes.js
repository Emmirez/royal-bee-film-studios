import { Router } from 'express';
import { CastingCall, CastingApplication } from '../../models/CastingCall.js';
import { TalentProfile } from '../../models/TalentProfile.js';
import { Project } from '../../models/Project.js';
import { nextReference } from '../../models/Counter.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { applicationOut, castingOut, dateText, emailTalent, talentLink } from './talent.service.js';
import * as v from './talent.validation.js';

/** Staff: casting calls and the applications to them. Mounted at /castings. */
const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = { path: 'project', select: 'title reference' };

async function load(id) {
  const casting = await CastingCall.findById(id).populate(POPULATE);
  if (!casting) throw ApiError.notFound('Casting call not found');
  return casting;
}

async function checkProject(projectId) {
  if (!projectId) return null;
  if (!(await Project.exists({ _id: projectId }))) throw ApiError.validation([{ path: 'projectId', message: 'Choose a project from the list' }]);
  return projectId;
}

async function applicationCounts(ids) {
  const rows = await CastingApplication.aggregate([{ $match: { casting: { $in: ids } } }, { $group: { _id: { c: '$casting', s: '$status' }, n: { $sum: 1 } } }]);
  return (id) => {
    const mine = rows.filter((r) => String(r._id.c) === String(id));
    const by = Object.fromEntries(mine.map((r) => [r._id.s, r.n]));
    return { total: mine.reduce((s, r) => s + (r._id.s === 'withdrawn' ? 0 : r.n), 0), new: by.applied || 0, shortlisted: by.shortlisted || 0, booked: by.booked || 0 };
  };
}

router.get(
  '/',
  requirePermission(P.TALENT_VIEW),
  validate(v.listCastingQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const filter = {};
    if (q.status) filter.status = q.status;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$or = [{ title: rx }, { reference: rx }, { location: rx }];
    }
    const [items, total] = await Promise.all([CastingCall.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit), CastingCall.countDocuments(filter)]);
    const countsFor = await applicationCounts(items.map((c) => c._id));
    return ok(res, items.map((c) => castingOut(c, { applications: countsFor(c._id) })), paginationMeta({ page, limit }, total));
  }),
);

router.post(
  '/',
  requirePermission(P.TALENT_MANAGE),
  validate(v.castingSchema),
  asyncHandler(async (req, res) => {
    const { projectId, ...rest } = req.body;
    const casting = await CastingCall.create({ ...rest, project: await checkProject(projectId), reference: await nextReference('CST'), status: 'draft', createdBy: req.user._id });
    await audit(req, { action: 'castings.created', entityType: 'CastingCall', entityId: casting._id, summary: casting.title });
    return created(res, castingOut(await casting.populate(POPULATE)));
  }),
);

router.get(
  '/:id',
  requirePermission(P.TALENT_VIEW),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    const applications = await CastingApplication.find({ casting: casting._id }).populate({ path: 'talent', populate: { path: 'user', select: 'status' } }).sort({ createdAt: 1 });
    const countsFor = await applicationCounts([casting._id]);
    return ok(res, { casting: castingOut(casting, { applications: countsFor(casting._id) }), applications: applications.map((a) => applicationOut(a)) });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.TALENT_MANAGE),
  validate(v.castingUpdateSchema),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    const { projectId, ...rest } = req.body;
    if (projectId !== undefined) casting.project = await checkProject(projectId);
    Object.assign(casting, rest);
    if (rest.status === 'open' && !casting.publishedAt) casting.publishedAt = new Date();
    await casting.save();
    await audit(req, { action: 'castings.updated', entityType: 'CastingCall', entityId: casting._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, castingOut(await load(casting._id)));
  }),
);

/** Open the casting to talent, optionally emailing everyone on the roster whose talent type matches. */
router.post(
  '/:id/publish',
  requirePermission(P.TALENT_MANAGE),
  validate(v.publishSchema),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    if (casting.status === 'open') throw ApiError.badRequest('This casting call is already open.');
    casting.status = 'open';
    casting.publishedAt = new Date();
    await casting.save();

    let notified = 0;
    if (req.body.notify) {
      const filter = { status: 'approved', user: { $ne: null } };
      if (casting.talentTypes.length) filter.talentTypes = { $in: casting.talentTypes };
      const talent = await TalentProfile.find(filter).populate('user', 'status').select('firstName email user');
      for (const t of talent.filter((x) => x.user && x.user.status === 'active')) {
        // eslint-disable-next-line no-await-in-loop
        await emailTalent(t, 'castingCallAlert', { title: casting.title, location: casting.location, shootDates: casting.shootDates, applyBy: dateText(casting.applyBy), link: talentLink(`/castings/${casting._id}`) });
        notified += 1;
      }
    }
    await audit(req, { action: 'castings.published', entityType: 'CastingCall', entityId: casting._id, summary: casting.title, metadata: { notified } });
    return ok(res, { ...castingOut(casting), notified });
  }),
);

router.post(
  '/:id/close',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    casting.status = 'closed';
    await casting.save();
    await audit(req, { action: 'castings.closed', entityType: 'CastingCall', entityId: casting._id });
    return ok(res, castingOut(casting));
  }),
);

router.delete(
  '/:id',
  requirePermission(P.TALENT_MANAGE),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    if (await CastingApplication.exists({ casting: casting._id })) throw ApiError.badRequest('This casting has applications — close it instead of deleting it.');
    await casting.deleteOne();
    await audit(req, { action: 'castings.deleted', entityType: 'CastingCall', entityId: casting._id, summary: casting.title, severity: 'notice' });
    return ok(res, { deleted: true });
  }),
);

/** Shortlist / decline an applicant (booking is done from the Bookings API). */
router.patch(
  '/:id/applications/:appId',
  requirePermission(P.TALENT_MANAGE),
  validate(v.applicationUpdateSchema),
  asyncHandler(async (req, res) => {
    const casting = await load(req.params.id);
    const application = await CastingApplication.findOne({ _id: req.params.appId, casting: casting._id }).populate('talent');
    if (!application) throw ApiError.notFound('Application not found');
    if (['booked', 'withdrawn'].includes(application.status) && req.body.status) throw ApiError.badRequest('This application has already been booked or withdrawn.');
    const changed = req.body.status && req.body.status !== application.status;
    if (req.body.status) application.status = req.body.status;
    if (req.body.staffNote !== undefined) application.staffNote = req.body.staffNote;
    await application.save();
    if (changed && req.body.notify && ['shortlisted', 'declined'].includes(application.status)) {
      await emailTalent(application.talent, application.status === 'shortlisted' ? 'castingShortlisted' : 'castingNotSelected', { title: casting.title, link: talentLink(`/castings/${casting._id}`) });
    }
    if (changed) await audit(req, { action: `castings.application_${application.status}`, entityType: 'CastingCall', entityId: casting._id, summary: application.talent?.email });
    return ok(res, applicationOut(await application.populate({ path: 'talent', populate: { path: 'user', select: 'status' } })));
  }),
);

export default router;