import { Router } from 'express';
import { Project } from '../../models/Project.js';
import { ProjectMessage } from '../../models/ProjectMessage.js';
import { Deliverable } from '../../models/Deliverable.js';
import { User } from '../../models/User.js';
import { nextReference } from '../../models/Counter.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { stageLabel } from '../../constants/projects.js';
import { audit } from '../../services/audit.service.js';
import { deliverableOut, emailClient, messageOut, projectOut } from './projects.service.js';
import * as v from './projects.validation.js';

/** Staff side of client projects. */
const router = Router();
router.use(authenticate(), requireStaff);

const POPULATE = [
  { path: 'client', select: 'firstName lastName email organization status' },
  { path: 'manager', select: 'firstName lastName email' },
];

async function loadProject(id) {
  const project = await Project.findById(id).populate(POPULATE);
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

async function checkClient(clientId) {
  const client = await User.findOne({ _id: clientId, accountType: 'client' }).select('_id status');
  if (!client) throw ApiError.validation([{ path: 'clientId', message: 'Choose a client from the list' }]);
  if (client.status === 'deactivated') throw ApiError.validation([{ path: 'clientId', message: 'This client account is deactivated' }]);
  return client;
}

async function checkManager(managerId) {
  if (!managerId) return null;
  const manager = await User.findOne({ _id: managerId, accountType: 'staff', status: 'active' }).select('_id');
  if (!manager) throw ApiError.validation([{ path: 'managerId', message: 'Choose an active staff member' }]);
  return manager._id;
}

const touch = (projectId, extra = {}) => Project.updateOne({ _id: projectId }, { lastActivityAt: new Date(), ...extra });

/* ───────── Projects ───────── */

router.get(
  '/',
  requirePermission(P.PROJECTS_VIEW),
  validate(v.listProjectsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validatedQuery;
    const { page, limit, skip } = parsePagination(q);
    const filter = {};
    if (q.status) filter.status = q.status;
    if (q.stage) filter.stage = q.stage;
    if (q.clientId) filter.client = q.clientId;
    if (q.awaiting === 'reply') filter.awaitingStaffReply = true;
    if (q.awaiting === 'changes') filter._id = { $in: await Deliverable.distinct('project', { status: 'changes_requested' }) };
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      const clients = await User.find({ accountType: 'client', $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { organization: rx }] }).distinct('_id');
      filter.$or = [{ title: rx }, { reference: rx }, { client: { $in: clients } }];
    }
    const [items, total] = await Promise.all([
      Project.find(filter).populate(POPULATE).sort({ lastActivityAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(filter),
    ]);
    const ids = items.map((p) => p._id);
    const pending = await Deliverable.aggregate([{ $match: { project: { $in: ids } } }, { $group: { _id: { project: '$project', status: '$status' }, n: { $sum: 1 } } }]);
    const counts = (id, status) => pending.find((r) => String(r._id.project) === String(id) && r._id.status === status)?.n || 0;
    return ok(
      res,
      items.map((p) => ({ ...projectOut(p), deliverables: { awaiting: counts(p._id, 'awaiting_review'), changes: counts(p._id, 'changes_requested'), approved: counts(p._id, 'approved') } })),
      paginationMeta({ page, limit }, total),
    );
  }),
);

router.post(
  '/',
  requirePermission(P.PROJECTS_MANAGE),
  validate(v.createProjectSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    await checkClient(b.clientId);
    const manager = await checkManager(b.managerId);
    const project = await Project.create({
      reference: await nextReference('PRJ'),
      title: b.title,
      client: b.clientId,
      summary: b.summary,
      serviceTitle: b.serviceTitle,
      stage: b.stage,
      status: b.status,
      startDate: b.startDate,
      dueDate: b.dueDate,
      manager,
      visibleToClient: b.visibleToClient,
      stageHistory: [{ stage: b.stage, by: req.user._id }],
      createdBy: req.user._id,
    });
    await audit(req, { action: 'projects.created', entityType: 'Project', entityId: project._id, summary: project.title });
    await emailClient(project, 'projectCreated', { stageLabel: stageLabel(project.stage) });
    return created(res, projectOut(await project.populate(POPULATE)));
  }),
);

router.get(
  '/:id',
  requirePermission(P.PROJECTS_VIEW),
  asyncHandler(async (req, res) => {
    const project = await loadProject(req.params.id);
    const [deliverables, messages] = await Promise.all([
      Deliverable.find({ project: project._id }).populate('decisions.by', 'firstName lastName').sort({ createdAt: -1 }),
      ProjectMessage.find({ project: project._id }).populate('author', 'firstName lastName photo').sort({ createdAt: 1 }).limit(500),
    ]);
    return ok(res, { project: projectOut(project), deliverables: deliverables.map(deliverableOut), messages: messages.map(messageOut) });
  }),
);

router.patch(
  '/:id',
  requirePermission(P.PROJECTS_MANAGE),
  validate(v.updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    const { clientId, managerId, ...rest } = req.body;
    if (clientId) {
      await checkClient(clientId);
      project.client = clientId;
    }
    if (managerId !== undefined) project.manager = await checkManager(managerId);
    const stageChanged = rest.stage && rest.stage !== project.stage;
    Object.assign(project, rest);
    if (stageChanged) project.stageHistory.push({ stage: rest.stage, by: req.user._id });
    project.lastActivityAt = new Date();
    await project.save();

    if (stageChanged) {
      await ProjectMessage.create({ project: project._id, author: req.user._id, system: true, body: `Project moved to ${stageLabel(project.stage)}.` });
      await emailClient(project, 'projectStageChanged', { stageLabel: stageLabel(project.stage) });
    }
    await audit(req, { action: 'projects.updated', entityType: 'Project', entityId: project._id, metadata: { fields: Object.keys(req.body) } });
    return ok(res, projectOut(await project.populate(POPULATE)));
  }),
);

router.delete(
  '/:id',
  requirePermission(P.PROJECTS_MANAGE),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    await Promise.all([Deliverable.deleteMany({ project: project._id }), ProjectMessage.deleteMany({ project: project._id }), project.deleteOne()]);
    await audit(req, { action: 'projects.deleted', entityType: 'Project', entityId: project._id, metadata: { title: project.title, reference: project.reference }, severity: 'warning' });
    return ok(res, { deleted: true });
  }),
);

/* ───────── Messages & updates ───────── */

router.post(
  '/:id/messages',
  requirePermission(P.PROJECTS_MANAGE),
  validate(v.staffMessageSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    const message = await ProjectMessage.create({ project: project._id, author: req.user._id, body: req.body.body, internal: req.body.internal });
    await touch(project._id, req.body.internal ? {} : { awaitingStaffReply: false });
    if (!req.body.internal) await emailClient(project, 'projectUpdate', { body: req.body.body, authorName: req.user.fullName });
    await message.populate('author', 'firstName lastName photo');
    return created(res, messageOut(message));
  }),
);

/** Mark a client's message as handled without replying. */
router.post(
  '/:id/mark-replied',
  requirePermission(P.PROJECTS_MANAGE),
  asyncHandler(async (req, res) => {
    await Project.updateOne({ _id: req.params.id }, { awaitingStaffReply: false });
    return ok(res, { ok: true });
  }),
);

/* ───────── Deliverables ───────── */

router.post(
  '/:id/deliverables',
  requirePermission(P.PROJECTS_MANAGE),
  validate(v.deliverableSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    const deliverable = await Deliverable.create({ ...req.body, previewImage: req.body.previewImage?.url ? req.body.previewImage : undefined, project: project._id, createdBy: req.user._id });
    await ProjectMessage.create({ project: project._id, author: req.user._id, system: true, body: `New for your review: ${deliverable.title}.` });
    await touch(project._id);
    await emailClient(project, 'deliverableReady', { deliverableTitle: deliverable.title, version: deliverable.version });
    await audit(req, { action: 'projects.deliverable_added', entityType: 'Project', entityId: project._id, summary: deliverable.title });
    return created(res, deliverableOut(deliverable));
  }),
);

router.patch(
  '/:id/deliverables/:did',
  requirePermission(P.PROJECTS_MANAGE),
  validate(v.updateDeliverableSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    const deliverable = await Deliverable.findOne({ _id: req.params.did, project: req.params.id });
    if (!project || !deliverable) throw ApiError.notFound('Deliverable not found');
    const { newVersion, previewImage, ...rest } = req.body;
    Object.assign(deliverable, rest);
    if (previewImage !== undefined) deliverable.previewImage = previewImage?.url ? previewImage : undefined;
    if (newVersion) {
      deliverable.version += 1;
      deliverable.status = 'awaiting_review';
    }
    await deliverable.save();
    if (newVersion) {
      await ProjectMessage.create({ project: project._id, author: req.user._id, system: true, body: `Version ${deliverable.version} of ${deliverable.title} is ready for your review.` });
      await emailClient(project, 'deliverableReady', { deliverableTitle: deliverable.title, version: deliverable.version });
    }
    await touch(project._id);
    await deliverable.populate('decisions.by', 'firstName lastName');
    return ok(res, deliverableOut(deliverable));
  }),
);

router.delete(
  '/:id/deliverables/:did',
  requirePermission(P.PROJECTS_MANAGE),
  asyncHandler(async (req, res) => {
    const deliverable = await Deliverable.findOneAndDelete({ _id: req.params.did, project: req.params.id });
    if (!deliverable) throw ApiError.notFound('Deliverable not found');
    await audit(req, { action: 'projects.deliverable_deleted', entityType: 'Project', entityId: req.params.id, summary: deliverable.title, severity: 'notice' });
    return ok(res, { deleted: true });
  }),
);

export default router;