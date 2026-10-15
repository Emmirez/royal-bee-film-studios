import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../../constants/content.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { audit } from '../../services/audit.service.js';
import { approvalRequired, editPolicy, resolveTransition } from '../../services/workflow.service.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  published: z.enum(['true', 'false']).optional(),
  category: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  sort: z.string().trim().max(40).optional(),
});

const transitionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'publish', 'unpublish', 'archive', 'restore']),
  comment: z.string().trim().max(1000).optional().default(''),
  publishAt: z.coerce.date().nullable().optional(),
  expireAt: z.coerce.date().nullable().optional(),
});

const reorderSchema = z.object({ ids: z.array(objectId).min(1).max(500) });

/**
 * Builds a full CMS router for a collection resource.
 *
 * options:
 *  - Model                 mongoose model
 *  - entity                audit/entity label, e.g. "Service"
 *  - workflow              'full' (draft→review→approved→published) | 'simple' (isPublished toggle)
 *  - createSchema          zod schema for create; update uses .partial()
 *  - slugFrom              field used to generate a unique slug (optional)
 *  - searchFields          fields searched with ?q=
 *  - populate              populate spec for detail responses
 *  - defaultSort           mongo sort object
 *  - categoryField         field filtered by ?category=
 *  - beforeDelete(doc)     optional async guard
 */
export function buildCrudRouter(options) {
  const {
    Model,
    entity,
    workflow = 'full',
    createSchema,
    slugFrom,
    searchFields = ['title'],
    populate,
    defaultSort = { order: 1, createdAt: -1 },
    categoryField = 'category',
    beforeDelete,
  } = options;

  const router = Router();
  const updateSchema = createSchema.partial();

  const load = async (id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) throw ApiError.notFound(`${entity} not found`);
    const query = Model.findById(id);
    if (populate) query.populate(populate);
    const doc = await query;
    if (!doc) throw ApiError.notFound(`${entity} not found`);
    return doc;
  };

  /* List (staff — includes drafts for preview) */
  router.get(
    '/',
    requirePermission(P.CMS_VIEW),
    validate(listQuery, 'query'),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery;
      const { page, limit, skip } = parsePagination(q, { defaultLimit: 50, maxLimit: 200 });
      const filter = {};
      if (workflow === 'full' && q.status) filter.status = q.status;
      if (workflow === 'simple' && q.published) filter.isPublished = q.published === 'true';
      if (q.category && categoryField) filter[categoryField] = q.category;
      if (q.q) {
        const rx = new RegExp(escapeRegex(q.q), 'i');
        filter.$or = searchFields.map((f) => ({ [f]: rx }));
      }
      const [items, total] = await Promise.all([
        Model.find(filter).sort(defaultSort).skip(skip).limit(limit).lean(),
        Model.countDocuments(filter),
      ]);
      return ok(res, items, paginationMeta({ page, limit }, total));
    }),
  );

  router.get(
    '/:id',
    requirePermission(P.CMS_VIEW),
    asyncHandler(async (req, res) => ok(res, await load(req.params.id))),
  );

  /* Create — always starts as draft / unpublished */
  router.post(
    '/',
    requirePermission(P.CMS_EDIT),
    validate(createSchema),
    asyncHandler(async (req, res) => {
      const data = { ...req.body, createdBy: req.user._id, updatedBy: req.user._id };
      if (workflow === 'full') {
        data.status = CONTENT_STATUS.DRAFT;
        delete data.publishedAt;
      } else {
        data.isPublished = false;
      }
      if (slugFrom) data.slug = await uniqueSlug(Model, req.body.slug || req.body[slugFrom]);
      if (data.order === undefined) {
        const last = await Model.findOne().sort({ order: -1 }).select('order').lean();
        data.order = (last?.order ?? -1) + 1;
      }
      const doc = await Model.create(data);
      await audit(req, { action: `cms.${entity.toLowerCase()}.created`, entityType: entity, entityId: doc._id, after: doc });
      return created(res, doc);
    }),
  );

  /* Update */
  router.patch(
    '/:id',
    requirePermission(P.CMS_EDIT),
    validate(updateSchema),
    asyncHandler(async (req, res) => {
      const doc = await load(req.params.id);
      const before = doc.toObject();
      const changes = { ...req.body };

      if (workflow === 'full') {
        const policy = editPolicy({ status: doc.status, role: req.user.role, approvalIsRequired: await approvalRequired() });
        if (policy.resetToDraft) {
          doc.reviewHistory.push({
            action: 'changed_after_approval',
            fromStatus: doc.status,
            toStatus: CONTENT_STATUS.DRAFT,
            by: req.user._id,
          });
          doc.status = CONTENT_STATUS.DRAFT;
        }
        delete changes.status;
      } else if ('isPublished' in changes) {
        delete changes.isPublished; // use publish/unpublish endpoints
      }

      if (slugFrom && changes.slug !== undefined) {
        changes.slug = await uniqueSlug(Model, changes.slug || doc[slugFrom], doc._id);
      }
      doc.set({ ...changes, updatedBy: req.user._id });
      await doc.save();
      await audit(req, {
        action: `cms.${entity.toLowerCase()}.updated`,
        entityType: entity,
        entityId: doc._id,
        before,
        after: doc,
        severity: workflow === 'full' && doc.status === CONTENT_STATUS.PUBLISHED ? 'notice' : 'info',
      });
      return ok(res, doc);
    }),
  );

  /* Delete — full workflow: only draft/archived items; simple: unpublish first */
  router.delete(
    '/:id',
    requirePermission(P.CMS_DELETE),
    asyncHandler(async (req, res) => {
      const doc = await load(req.params.id);
      if (workflow === 'full' && ![CONTENT_STATUS.DRAFT, CONTENT_STATUS.ARCHIVED].includes(doc.status)) {
        throw ApiError.conflict('Archive this item before deleting it');
      }
      if (beforeDelete) await beforeDelete(doc);
      await doc.deleteOne();
      await audit(req, { action: `cms.${entity.toLowerCase()}.deleted`, entityType: entity, entityId: doc._id, before: doc, severity: 'notice' });
      return ok(res, { deleted: true });
    }),
  );

  /* Reorder — pass the full ordered list of ids */
  router.post(
    '/reorder',
    requirePermission(P.CMS_EDIT),
    validate(reorderSchema),
    asyncHandler(async (req, res) => {
      const { ids } = req.body;
      await Model.bulkWrite(
        ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } })),
      );
      await audit(req, { action: `cms.${entity.toLowerCase()}.reordered`, entityType: entity, metadata: { ids } });
      return ok(res, { reordered: ids.length });
    }),
  );

  if (workflow === 'full') {
    router.post(
      '/:id/transition',
      requirePermission(P.CMS_VIEW),
      validate(transitionSchema),
      asyncHandler(async (req, res) => {
        const doc = await load(req.params.id);
        const { action, comment, publishAt, expireAt } = req.body;
        if (action === 'reject' && !comment) throw ApiError.badRequest('Please add a comment explaining what needs to change');

        const from = doc.status;
        const to = resolveTransition({
          action,
          currentStatus: from,
          role: req.user.role,
          approvalIsRequired: await approvalRequired(),
        });

        doc.status = to;
        if (action === 'publish') {
          doc.publishAt = publishAt ?? doc.publishAt ?? null;
          if (expireAt !== undefined) doc.expireAt = expireAt;
          if (doc.expireAt && doc.publishAt && doc.expireAt <= doc.publishAt) {
            throw ApiError.badRequest('Expiry must be after the publish time');
          }
          doc.publishedAt = new Date();
        }
        if (action === 'unpublish') doc.publishAt = null;
        doc.reviewHistory.push({ action, fromStatus: from, toStatus: to, by: req.user._id, comment });
        doc.updatedBy = req.user._id;
        await doc.save();

        await audit(req, {
          action: `cms.${entity.toLowerCase()}.${action}`,
          entityType: entity,
          entityId: doc._id,
          summary: `${from} → ${to}`,
          metadata: { comment, publishAt: doc.publishAt, expireAt: doc.expireAt },
          severity: ['publish', 'unpublish', 'approve'].includes(action) ? 'notice' : 'info',
        });
        return ok(res, doc);
      }),
    );
  } else {
    const toggle = (isPublished) =>
      asyncHandler(async (req, res) => {
        const doc = await load(req.params.id);
        doc.isPublished = isPublished;
        doc.updatedBy = req.user._id;
        await doc.save();
        await audit(req, {
          action: `cms.${entity.toLowerCase()}.${isPublished ? 'published' : 'unpublished'}`,
          entityType: entity,
          entityId: doc._id,
        });
        return ok(res, doc);
      });
    router.post('/:id/publish', requirePermission(P.CMS_PUBLISH), toggle(true));
    router.post('/:id/unpublish', requirePermission(P.CMS_PUBLISH), toggle(false));
  }

  return router;
}
