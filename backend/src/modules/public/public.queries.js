import { publicVisibilityFilter } from '../../constants/content.js';
import { Service } from '../../models/Service.js';
import { Production } from '../../models/Production.js';
import { NewsPost } from '../../models/NewsPost.js';
import { TickerItem } from '../../models/TickerItem.js';
import { FounderImage } from '../../models/FounderImage.js';
import { GalleryImage } from '../../models/GalleryImage.js';
import { CallToAction } from '../../models/CallToAction.js';

/** Shared, permission-safe public queries. Nothing here may return unpublished or private data. */

export const publicServicesFilter = () => publicVisibilityFilter();

/** Listed productions: published, scheduled time reached, not expired, visibility = public. */
export const publicProductionsFilter = () => ({ ...publicVisibilityFilter(), visibility: 'public' });

/** Direct-link productions may also be "unlisted", never "private". */
export const linkableProductionFilter = () => ({ ...publicVisibilityFilter(), visibility: { $in: ['public', 'unlisted'] } });

export const publicNewsFilter = () => publicVisibilityFilter();

export function listPublicServices({ ids, limit } = {}) {
  const filter = publicServicesFilter();
  if (ids?.length) filter._id = { $in: ids };
  const q = Service.find(filter).sort({ order: 1, title: 1 });
  if (limit) q.limit(limit);
  return q.lean();
}

export function listPublicProductions({ ids, featured, category, limit, skip = 0 } = {}) {
  const filter = publicProductionsFilter();
  if (ids?.length) filter._id = { $in: ids };
  if (featured) filter.isFeatured = true;
  if (category) filter.category = category;
  const q = Production.find(filter).sort({ isFeatured: -1, order: 1, year: -1, createdAt: -1 }).skip(skip);
  if (limit) q.limit(limit);
  return q.lean();
}

export function listPublicNews({ limit = 3, skip = 0, category, featured } = {}) {
  const filter = publicNewsFilter();
  if (category) filter.category = category;
  if (featured) filter.isFeatured = true;
  return NewsPost.find(filter).sort({ publishAt: -1, publishedAt: -1 }).skip(skip).limit(limit).lean();
}

export function listTickerItems() {
  return TickerItem.find({ isPublished: true })
    .sort({ order: 1 })
    .limit(60)
    .populate({ path: 'link.production', match: publicVisibilityFilter(), select: 'slug visibility' })
    .lean();
}

export function listFounderImages({ featuredOnly = false, limit } = {}) {
  const q = FounderImage.find({ isPublished: true, ...(featuredOnly ? { isFeatured: true } : {}) }).sort({ order: 1 });
  if (limit) q.limit(limit);
  return q.lean();
}

export function listGalleryImages({ category, limit = 60, skip = 0 } = {}) {
  return GalleryImage.find({ isPublished: true, ...(category ? { category } : {}) })
    .sort({ isFeatured: -1, order: 1 })
    .skip(skip)
    .limit(limit)
    .populate({ path: 'production', match: { ...publicVisibilityFilter(), visibility: 'public' }, select: 'title slug' })
    .lean();
}

export function listActiveCtas({ placement, serviceId, productionId } = {}) {
  const now = new Date();
  const filter = {
    isPublished: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  };
  if (placement) filter.placement = placement;
  if (serviceId) filter['context.service'] = { $in: [null, serviceId] };
  if (productionId) filter['context.production'] = { $in: [null, productionId] };
  return CallToAction.find(filter).sort({ order: 1 }).select('label description href placement variant context').lean();
}
