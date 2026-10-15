/**
 * Content workflow.
 *  - "full" workflow (services, productions, news, homepage sections):
 *      draft → in_review → approved → published → archived
 *      (rejected goes back to draft with a comment)
 *  - "simple" workflow (ticker images, gallery images, founder images):
 *      isPublished true/false toggled by users with cms.publish
 */
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const CONTENT_STATUSES = Object.values(CONTENT_STATUS);

/** Allowed manual transitions and the permission each needs. */
export const TRANSITIONS = {
  submit: { from: ['draft'], to: 'in_review', permission: 'cms.edit' },
  approve: { from: ['in_review'], to: 'approved', permission: 'cms.approve' },
  reject: { from: ['in_review', 'approved'], to: 'draft', permission: 'cms.approve' },
  publish: { from: ['approved'], to: 'published', permission: 'cms.publish' },
  unpublish: { from: ['published'], to: 'approved', permission: 'cms.publish' },
  archive: { from: ['draft', 'approved', 'published'], to: 'archived', permission: 'cms.publish' },
  restore: { from: ['archived'], to: 'draft', permission: 'cms.edit' },
};

/**
 * Mongo filter for content that may be shown publicly right now:
 * published, publish time reached, and not expired.
 */
export function publicVisibilityFilter(now = new Date()) {
  return {
    status: CONTENT_STATUS.PUBLISHED,
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expireAt: null }, { expireAt: { $gt: now } }] },
    ],
  };
}

/** Same rule, evaluated in JS (used by tests and singleton checks). */
export function isPubliclyVisible(doc, now = new Date()) {
  if (!doc || doc.status !== CONTENT_STATUS.PUBLISHED) return false;
  if (doc.publishAt && new Date(doc.publishAt) > now) return false;
  if (doc.expireAt && new Date(doc.expireAt) <= now) return false;
  return true;
}

export const HOME_SECTION_TYPES = [
  'hero',
  'intro',
  'ticker',
  'featured_productions',
  'services',
  'founder',
  'news',
  'gallery',
  'partner',
  'talent',
  'testimonials',
  'cta',
  'contact',
];

export const PRODUCTION_CATEGORIES = [
  'Feature Film',
  'Short Film',
  'Documentary',
  'Series',
  'Commercial',
  'Music Video',
  'Brand Film',
  'Corporate',
];

export const FOUNDER_IMAGE_CATEGORIES = ['portrait', 'studio', 'on_set', 'behind_the_scenes', 'press'];
export const GALLERY_CATEGORIES = ['studio', 'production', 'behind_the_scenes', 'on_set', 'crew'];

export const CTA_PLACEMENTS = [
  'navbar',
  'hero',
  'home_banner',
  'home_footer',
  'service_page',
  'production_page',
  'founder_page',
  'news_page',
  'global_footer',
];
