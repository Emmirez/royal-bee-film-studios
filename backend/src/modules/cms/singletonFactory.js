import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import { approvalRequired } from '../../services/workflow.service.js';

const commentSchema = z.object({ comment: z.string().trim().max(1000).optional().default('') });

/**
 * Draft/publish router for singleton content (hero, founder).
 *   GET    /           → { draft, published, reviewStatus, hasUnpublishedChanges, ... }
 *   PATCH  /           → edit the draft (cms.edit)
 *   POST   /submit     → request review (cms.edit)
 *   POST   /approve    → approve the current draft (cms.approve)
 *   POST   /reject     → send back with a comment (cms.approve)
 *   POST   /publish    → copy draft → published (cms.publish; must be approved when approval is required)
 *   POST   /discard    → reset draft to the published version (cms.edit)
 */
export function buildSingletonRouter({ Model, entity, updateSchema, populateDraft }) {
  const router = Router();
  const label = entity.toLowerCase();

  const load = async () => {
    const doc = await Model.getMain();
    if (populateDraft) await doc.populate(populateDraft);
    return doc;
  };

  router.get('/', requirePermission(P.CMS_VIEW), asyncHandler(async (_req, res) => ok(res, await load())));

  router.patch(
    '/',
    requirePermission(P.CMS_EDIT),
    validate(updateSchema),
    asyncHandler(async (req, res) => {
      const doc = await Model.getMain();
      const before = doc.draft?.toObject?.() ?? doc.draft;
      const merged = { ...(doc.draft?.toObject?.() ?? {}), ...req.body };
      doc.draft = merged;
      doc.hasUnpublishedChanges = true;
      if (doc.reviewStatus === 'approved') {
        doc.reviewHistory.push({ action: 'changed_after_approval', by: req.user._id });
      }
      doc.reviewStatus = 'editing';
      doc.draftUpdatedAt = new Date();
      doc.draftUpdatedBy = req.user._id;
      await doc.save();
      await audit(req, { action: `cms.${label}.draft_updated`, entityType: entity, before, after: doc.draft });
      return ok(res, await load());
    }),
  );

  const step = (permission, action, mutate) =>
    router.post(
      `/${action}`,
      requirePermission(permission),
      validate(commentSchema),
      asyncHandler(async (req, res) => {
        const doc = await Model.getMain();
        await mutate(doc, req);
        doc.reviewHistory.push({ action, by: req.user._id, comment: req.body.comment });
        await doc.save();
        await audit(req, {
          action: `cms.${label}.${action}`,
          entityType: entity,
          metadata: { comment: req.body.comment },
          severity: ['publish', 'approve'].includes(action) ? 'notice' : 'info',
        });
        return ok(res, await load());
      }),
    );

  step(P.CMS_EDIT, 'submit', async (doc) => {
    if (!doc.hasUnpublishedChanges) throw ApiError.conflict('There are no unpublished changes to review');
    if (doc.reviewStatus !== 'editing') throw ApiError.conflict('This draft is already in review');
    doc.reviewStatus = 'in_review';
  });

  step(P.CMS_APPROVE, 'approve', async (doc) => {
    if (doc.reviewStatus !== 'in_review') throw ApiError.conflict('Submit the draft for review first');
    doc.reviewStatus = 'approved';
  });

  step(P.CMS_APPROVE, 'reject', async (doc, req) => {
    if (!req.body.comment) throw ApiError.badRequest('Please add a comment explaining what needs to change');
    if (doc.reviewStatus === 'editing') throw ApiError.conflict('Nothing is waiting for review');
    doc.reviewStatus = 'editing';
  });

  step(P.CMS_PUBLISH, 'publish', async (doc) => {
    if (!doc.hasUnpublishedChanges && doc.published) throw ApiError.conflict('Everything is already published');
    if ((await approvalRequired()) && doc.reviewStatus !== 'approved') {
      throw ApiError.conflict('This draft must be approved before it can be published');
    }
    doc.published = doc.draft?.toObject?.() ?? doc.draft;
    doc.publishedAt = new Date();
    doc.reviewStatus = 'editing';
    doc.hasUnpublishedChanges = false;
  });

  step(P.CMS_EDIT, 'discard', async (doc, req) => {
    if (!doc.published) throw ApiError.conflict('Nothing has been published yet');
    doc.draft = doc.published?.toObject?.() ?? doc.published;
    doc.reviewStatus = 'editing';
    doc.hasUnpublishedChanges = false;
    doc.draftUpdatedAt = new Date();
    doc.draftUpdatedBy = req.user._id;
  });

  return router;
}
