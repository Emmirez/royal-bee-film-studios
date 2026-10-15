import { Router } from 'express';
import { z } from 'zod';
import { MediaAsset } from '../../models/MediaAsset.js';
import { asyncHandler, ok, created, parsePagination, paginationMeta, escapeRegex } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireStaff, requirePermission } from '../../middleware/auth.js';
import { staffMediaUpload } from '../../middleware/upload.js';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { audit } from '../../services/audit.service.js';
import {
  MEDIA_FOLDERS,
  destroyResource,
  fetchResource,
  folderPath,
  signUpload,
  uploadBuffer,
} from '../../services/media.service.js';
import { findMediaUsage } from '../../services/mediaUsage.service.js';

const router = Router();
router.use(authenticate(), requireStaff);

const folder = z.enum(MEDIA_FOLDERS).default('general');

function toAssetDoc(result, req, extra = {}) {
  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    deliveryType: result.type || 'upload',
    access: result.type === 'upload' ? 'public' : 'private',
    url: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    duration: result.duration,
    originalFilename: result.original_filename || '',
    folder: result.folder || result.asset_folder || '',
    tags: result.tags || [],
    uploadedBy: req.user._id,
    ...extra,
  };
}

/* Library listing */
router.get(
  '/',
  requirePermission(P.MEDIA_VIEW),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 40, maxLimit: 100 });
    const filter = {};
    if (req.query.type && ['image', 'video', 'raw'].includes(req.query.type)) filter.resourceType = req.query.type;
    if (req.query.folder && MEDIA_FOLDERS.includes(req.query.folder)) filter.folder = folderPath(req.query.folder);
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
      filter.$or = [{ originalFilename: rx }, { alt: rx }, { caption: rx }, { tags: rx }];
    }
    const [items, total] = await Promise.all([
      MediaAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaAsset.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta({ page, limit }, total));
  }),
);

/* Backend-mediated upload (images, short videos, documents) */
router.post(
  '/upload',
  requirePermission(P.MEDIA_UPLOAD),
  staffMediaUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a file to upload');
    const parsed = z
      .object({ folder, alt: z.string().trim().max(250).optional().default(''), caption: z.string().trim().max(300).optional().default('') })
      .parse(req.body);
    const isImage = req.file.mimetype.startsWith('image/');
    if (isImage && req.file.size > 15 * 1024 * 1024) throw ApiError.badRequest('Images must be 15MB or smaller');
    const result = await uploadBuffer(req.file.buffer, {
      folder: folderPath(parsed.folder),
      resourceType: req.file.mimetype.startsWith('video/') ? 'video' : isImage ? 'image' : 'raw',
      tags: ['royal-bee-cms', parsed.folder],
    });
    const asset = await MediaAsset.create(
      toAssetDoc(result, req, { alt: parsed.alt, caption: parsed.caption, originalFilename: req.file.originalname }),
    );
    await audit(req, { action: 'media.uploaded', entityType: 'MediaAsset', entityId: asset._id, metadata: { publicId: asset.publicId } });
    return created(res, asset);
  }),
);

/* Signed direct upload — for large hero videos. Step 1: get signature. */
router.post(
  '/sign',
  requirePermission(P.MEDIA_UPLOAD),
  validate(z.object({ folder, resourceType: z.enum(['image', 'video']).default('image') })),
  asyncHandler(async (req, res) => ok(res, signUpload(req.body))),
);

/* Step 2: register the finished direct upload (verified against Cloudinary). */
router.post(
  '/register',
  requirePermission(P.MEDIA_UPLOAD),
  validate(
    z.object({
      publicId: z.string().trim().min(1).max(300),
      resourceType: z.enum(['image', 'video']).default('image'),
      alt: z.string().trim().max(250).optional().default(''),
      caption: z.string().trim().max(300).optional().default(''),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { publicId, resourceType, alt, caption } = req.body;
    if (!MEDIA_FOLDERS.some((f) => publicId.startsWith(`${folderPath(f)}/`))) {
      throw ApiError.badRequest('This file was not uploaded to an approved folder');
    }
    const existing = await MediaAsset.findOne({ publicId });
    if (existing) return ok(res, existing);
    let result;
    try {
      result = await fetchResource(publicId, resourceType);
    } catch {
      throw ApiError.badRequest('We could not find that upload on Cloudinary');
    }
    const asset = await MediaAsset.create(toAssetDoc(result, req, { alt, caption }));
    await audit(req, { action: 'media.registered', entityType: 'MediaAsset', entityId: asset._id, metadata: { publicId } });
    return created(res, asset);
  }),
);

router.patch(
  '/:id',
  requirePermission(P.MEDIA_UPLOAD),
  validate(z.object({ alt: z.string().trim().max(250), caption: z.string().trim().max(300), tags: z.array(z.string().trim().max(40)).max(20) }).partial().strict()),
  asyncHandler(async (req, res) => {
    const asset = await MediaAsset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) throw ApiError.notFound('Media not found');
    return ok(res, asset);
  }),
);

/* Where is this file used? Shown before deleting. */
router.get(
  '/:id/usage',
  requirePermission(P.MEDIA_VIEW),
  asyncHandler(async (req, res) => {
    const asset = await MediaAsset.findById(req.params.id);
    if (!asset) throw ApiError.notFound('Media not found');
    return ok(res, await findMediaUsage(asset));
  }),
);

/* Delete — refuses while the file is still in use unless ?force=true (and still audited). */
router.delete(
  '/:id',
  requirePermission(P.MEDIA_DELETE),
  asyncHandler(async (req, res) => {
    const asset = await MediaAsset.findById(req.params.id);
    if (!asset) throw ApiError.notFound('Media not found');
    const usage = await findMediaUsage(asset);
    if (usage.length && req.query.force !== 'true') {
      throw ApiError.conflict('This file is still used on the website', { usage });
    }
    await destroyResource(asset.publicId, asset.resourceType, asset.deliveryType);
    await asset.deleteOne();
    await audit(req, {
      action: 'media.deleted',
      entityType: 'MediaAsset',
      entityId: asset._id,
      before: asset,
      metadata: { forcedWhileInUse: usage.length > 0, usage },
      severity: usage.length ? 'warning' : 'notice',
    });
    return ok(res, { deleted: true });
  }),
);

export default router;
