import { Router } from 'express';
import { Project } from '../../models/Project.js';
import { ProjectMessage } from '../../models/ProjectMessage.js';
import { Deliverable } from '../../models/Deliverable.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok, created } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireClient } from '../../middleware/auth.js';
import { audit } from '../../services/audit.service.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { adminProjectLink, deliverableOut, messageOut, projectOut, staffRecipientsFor } from '../projects/projects.service.js';
import { clientMessageSchema, decisionSchema } from '../projects/projects.validation.js';

/** Client portal: a client only ever sees their own, visible projects. */
const router = Router();
router.use(authenticate(), requireClient);

const MANAGER = { path: 'manager', select: 'firstName lastName' };

async function ownProject(req) {
  const project = await Project.findOne({ _id: req.params.id, client: req.user._id, visibleToClient: true }).populate(MANAGER);
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

const clientName = (req) => `${req.user.firstName} ${req.user.lastName}`.trim();

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ client: req.user._id, visibleToClient: true }).populate(MANAGER).sort({ lastActivityAt: -1 }).limit(200);
    const awaiting = await Deliverable.aggregate([
      { $match: { project: { $in: projects.map((p) => p._id) }, status: 'awaiting_review' } },
      { $group: { _id: '$project', n: { $sum: 1 } } },
    ]);
    const awaitingFor = (id) => awaiting.find((a) => String(a._id) === String(id))?.n || 0;
    return ok(res, projects.map((p) => ({ ...projectOut(p, { forClient: true }), awaitingReview: awaitingFor(p._id) })));
  }),
);

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const project = await ownProject(req);
    const [deliverables, messages] = await Promise.all([
      Deliverable.find({ project: project._id }).sort({ createdAt: -1 }),
      ProjectMessage.find({ project: project._id, internal: false }).populate('author', 'firstName lastName photo').sort({ createdAt: 1 }).limit(500),
    ]);
    return ok(res, {
      project: projectOut(project, { forClient: true }),
      deliverables: deliverables.map(deliverableOut),
      messages: messages.map(messageOut),
    });
  }),
);

router.post(
  '/projects/:id/messages',
  validate(clientMessageSchema),
  asyncHandler(async (req, res) => {
    const project = await ownProject(req);
    const message = await ProjectMessage.create({ project: project._id, author: req.user._id, fromClient: true, body: req.body.body });
    await Project.updateOne({ _id: project._id }, { lastActivityAt: new Date(), awaitingStaffReply: true });
    const to = await staffRecipientsFor(project);
    if (to?.length) {
      sendEmailInBackground({
        to,
        template: 'clientMessageAlert',
        data: { clientName: clientName(req), projectTitle: project.title, reference: project.reference, body: req.body.body, link: adminProjectLink(project) },
        relatedType: 'Project',
        relatedId: project._id,
      });
    }
    await message.populate('author', 'firstName lastName photo');
    return created(res, messageOut(message));
  }),
);

router.post(
  '/projects/:id/deliverables/:did/decision',
  validate(decisionSchema),
  asyncHandler(async (req, res) => {
    const project = await ownProject(req);
    const deliverable = await Deliverable.findOne({ _id: req.params.did, project: project._id });
    if (!deliverable) throw ApiError.notFound('Deliverable not found');
    if (deliverable.status !== 'awaiting_review') throw ApiError.badRequest('This item has already been reviewed. The studio will share a new version if needed.');

    const { decision, comment } = req.body;
    deliverable.status = decision;
    deliverable.decisions.push({ version: deliverable.version, decision, comment, by: req.user._id, at: new Date() });
    await deliverable.save();

    const verb = decision === 'approved' ? 'approved' : 'requested changes to';
    await ProjectMessage.create({
      project: project._id,
      author: req.user._id,
      fromClient: true,
      system: true,
      body: `${clientName(req)} ${verb} ${deliverable.title} (version ${deliverable.version})${comment ? `: “${comment}”` : '.'}`,
    });
    await Project.updateOne({ _id: project._id }, { lastActivityAt: new Date() });

    const to = await staffRecipientsFor(project);
    if (to?.length) {
      sendEmailInBackground({
        to,
        template: 'clientDecisionAlert',
        data: {
          clientName: clientName(req),
          projectTitle: project.title,
          reference: project.reference,
          deliverableTitle: deliverable.title,
          version: deliverable.version,
          approved: decision === 'approved',
          comment,
          link: adminProjectLink(project),
        },
        relatedType: 'Project',
        relatedId: project._id,
      });
    }
    await audit(req, { action: `portal.deliverable_${decision}`, entityType: 'Project', entityId: project._id, summary: deliverable.title });
    return ok(res, deliverableOut(deliverable));
  }),
);

export default router;