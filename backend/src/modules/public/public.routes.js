import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, parsePagination, paginationMeta } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { trackingLimiter } from '../../middleware/rateLimiters.js';
import { isPubliclyVisible, PRODUCTION_CATEGORIES, GALLERY_CATEGORIES, CTA_PLACEMENTS, publicVisibilityFilter } from '../../constants/content.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { Hero } from '../../models/Hero.js';
import { Founder } from '../../models/Founder.js';
import { HomeSection } from '../../models/HomeSection.js';
import { PartnerPage } from '../../models/PartnerPage.js';
import { DEFAULT_PARTNER_PAGE } from '../../constants/partner.js';
import { Service } from '../../models/Service.js';
import { Production } from '../../models/Production.js';
import { NewsPost } from '../../models/NewsPost.js';
import { CallToAction, CtaStat } from '../../models/CallToAction.js';
import * as S from './public.serializers.js';
import * as Q from './public.queries.js';
import searchRoutes from './search.routes.js';

const router = Router();

// Short shared caching for public content (CDN-friendly, still fresh after publishing).
router.use((req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  next();
});

router.use('/search', searchRoutes);

/* ───────── Site-wide ───────── */

router.get(
  '/settings',
  asyncHandler(async (_req, res) => ok(res, S.settingsPublic(await SiteSettings.getMain()))),
);

router.get(
  '/hero',
  asyncHandler(async (_req, res) => {
    const hero = await Hero.findOne({ key: 'main' }).lean();
    return ok(res, S.heroPublic(hero?.published));
  }),
);

router.get(
  '/ticker',
  asyncHandler(async (_req, res) => {
    const settings = await SiteSettings.getMain();
    const items = settings.ticker?.enabled ? await Q.listTickerItems() : [];
    return ok(res, { settings: settings.ticker, items: items.map(S.tickerItem) });
  }),
);

/* ───────── Homepage (all enabled, published sections with resolved data) ───────── */

async function resolveSection(section, ctx) {
  const c = section.content || {};
  const base = { id: section._id, type: section.type, layout: section.layout, theme: section.theme, content: c };
  switch (section.type) {
    case 'hero':
      return { ...base, data: S.heroPublic(ctx.hero) };
    case 'ticker':
      return { ...base, data: { settings: ctx.settings.ticker, items: ctx.settings.ticker?.enabled ? (await Q.listTickerItems()).map(S.tickerItem) : [] } };
    case 'featured_productions': {
      const ids = Array.isArray(c.productionIds) ? c.productionIds : [];
      let items = await Q.listPublicProductions(ids.length ? { ids } : { featured: true, limit: c.limit || 6 });
      if (!ids.length && !items.length) items = await Q.listPublicProductions({ limit: c.limit || 6 });
      if (ids.length) items.sort((a, b) => ids.indexOf(String(a._id)) - ids.indexOf(String(b._id)));
      return { ...base, data: { items: items.map(S.productionCard) } };
    }
    case 'services': {
      const ids = Array.isArray(c.serviceIds) ? c.serviceIds : [];
      const items = await Q.listPublicServices({ ids, limit: c.limit || 0 });
      return { ...base, data: { items: items.map(S.serviceCard) } };
    }
    case 'founder': {
      const images = await Q.listFounderImages({ limit: 4 });
      return { ...base, data: { founder: S.founderPublic(ctx.founder, { full: false }), images: images.map(S.imageItem) } };
    }
    case 'news': {
      const items = await Q.listPublicNews({ limit: c.limit || 3 });
      return { ...base, data: { items: items.map(S.newsCard) } };
    }
      case 'gallery': {
      const category = c.category && c.category !== 'all' ? c.category : undefined;
      const items = await Q.listGalleryImages({ category, limit: 6 });
      return { ...base, data: { items: items.map(S.imageItem) } };
    }
    case 'testimonials':
      return { ...base, content: { ...c, items: (c.items || []).filter((t) => t.approved) } };
    case 'contact':
      return { ...base, data: { contact: ctx.settings.contact, social: ctx.settings.social } };
    default:
      return base;
  }
}

router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [settings, heroDoc, founderDoc, sections] = await Promise.all([
      SiteSettings.getMain(),
      Hero.findOne({ key: 'main' }).lean(),
      Founder.findOne({ key: 'main' }).lean(),
      HomeSection.find({ ...publicVisibilityFilter(), enabled: true }).sort({ order: 1 }).lean(),
    ]);
    const ctx = { settings, hero: heroDoc?.published, founder: founderDoc?.published };
    const resolved = await Promise.all(sections.map((s) => resolveSection(s, ctx)));
    return ok(res, { sections: resolved });
  }),
);

/* ───────── Founder ───────── */

router.get(
  '/founder',
  asyncHandler(async (_req, res) => {
    const doc = await Founder.findOne({ key: 'main' })
      .populate({ path: 'published.relatedProductions', match: { ...publicVisibilityFilter(), visibility: 'public' } })
      .lean();
    const founder = doc?.published;
    if (!founder) throw ApiError.notFound('The founder profile has not been published yet');
    const gallery = await Q.listFounderImages();
    return ok(res, {
      ...S.founderPublic(founder),
      relatedProductions: (founder.relatedProductions || []).filter(Boolean).map(S.productionCard),
      gallery: gallery.map(S.imageItem),
    });
  }),
);

router.get(
  '/founder/gallery',
  asyncHandler(async (_req, res) => ok(res, (await Q.listFounderImages()).map(S.imageItem))),
);

/* ───────── Partner with us ───────── */

router.get(
  '/partner',
  asyncHandler(async (_req, res) => {
    const doc = await PartnerPage.findOne({ key: 'main' }).select('published').lean();
    const page = { ...DEFAULT_PARTNER_PAGE, ...(doc?.published || {}) };
    return ok(res, {
      eyebrow: page.eyebrow,
      heading: page.heading,
      intro: page.intro,
      image: page.image?.url ? page.image : null,
      typesHeading: page.typesHeading,
      types: (page.types || []).map(({ key, title, description }) => ({ key, title, description })),
      stepsHeading: page.stepsHeading,
      steps: (page.steps || []).map(({ title, description }) => ({ title, description })),
      formHeading: page.formHeading,
      formIntro: page.formIntro,
      successMessage: page.successMessage,
    });
  }),
);

/* ───────── Galleries ───────── */

// Photos added on the homepage "Image gallery" section get their own "Image Gallery" filter
const HOME_GALLERY_KEY = 'image_gallery';

async function listHomeGalleryPhotos() {
  const sections = await HomeSection.find({ ...publicVisibilityFilter(), enabled: true, type: 'gallery' }).sort({ order: 1 }).lean();
  const seen = new Set();
  const photos = [];
  sections.forEach((section) => {
    (section.content?.images || []).forEach((p, idx) => {
      const url = p?.image?.url;
      if (!url || seen.has(url)) return;
      seen.add(url);
      photos.push(S.imageItem({ _id: `${section._id}-${idx}`, image: p.image, caption: p.caption || '', category: HOME_GALLERY_KEY }));
    });
  });
  return photos;
}

router.get(
  '/gallery',
  asyncHandler(async (req, res) => {
    const requested = String(req.query.category || '');
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 40, maxLimit: 100 });
    const homePhotos = await listHomeGalleryPhotos();
    const categories = homePhotos.length ? [HOME_GALLERY_KEY, ...GALLERY_CATEGORIES] : GALLERY_CATEGORIES;

    // "Image Gallery" filter → only the homepage gallery photos
    if (requested === HOME_GALLERY_KEY) {
      return ok(res, homePhotos.slice(skip, skip + limit), { page, limit, categories });
    }

    const category = GALLERY_CATEGORIES.includes(requested) ? requested : undefined;
    const items = (await Q.listGalleryImages({ category, limit, skip })).map(S.imageItem);

    // "All" filter, first page → homepage gallery photos first (no duplicates)
    if (!category && skip === 0) {
      const seen = new Set(items.map((i) => i.image?.url));
      items.unshift(...homePhotos.filter((p) => !seen.has(p.image?.url)));
    }

    return ok(res, items, { page, limit, categories });
  }),
);

/* ───────── Services ───────── */

router.get(
  '/services',
  asyncHandler(async (_req, res) => ok(res, (await Q.listPublicServices()).map(S.serviceCard))),
);

router.get(
  '/services/:slug',
  asyncHandler(async (req, res) => {
    const service = await Service.findOne({ slug: String(req.params.slug), ...Q.publicServicesFilter() }).lean();
    if (!service) throw ApiError.notFound('Service not found');
    const portfolio = service.portfolio?.length
      ? await Q.listPublicProductions({ ids: service.portfolio, limit: 6 })
      : [];
    const ctas = await Q.listActiveCtas({ placement: 'service_page', serviceId: service._id });
    return ok(res, { ...S.serviceDetail(service), portfolio: portfolio.map(S.productionCard), ctas });
  }),
);

/** Enquiry form config for a service (conditional questions). */
router.get(
  '/services/:slug/enquiry-form',
  asyncHandler(async (req, res) => {
    const service = await Service.findOne({ slug: String(req.params.slug), ...Q.publicServicesFilter() })
      .select('title slug enquiryQuestions')
      .lean();
    if (!service) throw ApiError.notFound('Service not found');
    return ok(res, { id: service._id, title: service.title, slug: service.slug, questions: service.enquiryQuestions || [] });
  }),
);

/* ───────── Productions / portfolio ───────── */

const productionListQuery = z.object({
  category: z.enum(PRODUCTION_CATEGORIES).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

router.get(
  '/productions',
  asyncHandler(async (req, res) => {
    const q = productionListQuery.parse(req.query);
    const { page, limit, skip } = parsePagination(q, { defaultLimit: 12, maxLimit: 48 });
    const filter = Q.publicProductionsFilter();
    if (q.category) filter.category = q.category;
    if (q.featured === 'true') filter.isFeatured = true;
    const [items, total, categories] = await Promise.all([
      Q.listPublicProductions({ category: q.category, featured: q.featured === 'true', limit, skip }),
      Production.countDocuments(filter),
      Production.distinct('category', Q.publicProductionsFilter()),
    ]);
    return ok(res, items.map(S.productionCard), { ...paginationMeta({ page, limit }, total), categories });
  }),
);

router.get(
  '/productions/:slug',
  asyncHandler(async (req, res) => {
    const production = await Production.findOne({ slug: String(req.params.slug), ...Q.linkableProductionFilter() })
      .populate({ path: 'services', match: publicVisibilityFilter(), select: 'title slug' })
      .lean();
    if (!production) throw ApiError.notFound('Production not found');

    let related = production.relatedProductions?.length
      ? await Q.listPublicProductions({ ids: production.relatedProductions, limit: 3 })
      : [];
    if (!related.length) {
      related = (await Q.listPublicProductions({ category: production.category, limit: 4 }))
        .filter((p) => String(p._id) !== String(production._id))
        .slice(0, 3);
    }
    const ctas = await Q.listActiveCtas({ placement: 'production_page', productionId: production._id });
    return ok(res, { ...S.productionDetail(production), related: related.map(S.productionCard), ctas });
  }),
);

/* ───────── News ───────── */

router.get(
  '/news',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9, maxLimit: 30 });
    const category = req.query.category ? String(req.query.category).slice(0, 60) : undefined;
    const filter = Q.publicNewsFilter();
    if (category) filter.category = category;
    const [items, total, categories] = await Promise.all([
      Q.listPublicNews({ limit, skip, category }),
      NewsPost.countDocuments(filter),
      NewsPost.distinct('category', Q.publicNewsFilter()),
    ]);
    return ok(res, items.map(S.newsCard), { ...paginationMeta({ page, limit }, total), categories });
  }),
);

router.get(
  '/news/:slug',
  asyncHandler(async (req, res) => {
    const post = await NewsPost.findOne({ slug: String(req.params.slug), ...Q.publicNewsFilter() }).lean();
    if (!post || !isPubliclyVisible(post)) throw ApiError.notFound('Article not found');
    const more = (await Q.listPublicNews({ limit: 4 })).filter((n) => String(n._id) !== String(post._id)).slice(0, 3);
    return ok(res, { ...S.newsDetail(post), more: more.map(S.newsCard) });
  }),
);

/* ───────── Calls to action ───────── */

router.get(
  '/ctas',
  asyncHandler(async (req, res) => {
    const placement = CTA_PLACEMENTS.includes(req.query.placement) ? req.query.placement : undefined;
    return ok(res, await Q.listActiveCtas({ placement }));
  }),
);

/** Aggregate click counting only — no cookies, IPs or user identifiers stored. */
router.post(
  '/ctas/:id/click',
  trackingLimiter,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!/^[0-9a-fA-F]{24}$/.test(id)) throw ApiError.notFound('CTA not found');
    const cta = await CallToAction.findOneAndUpdate({ _id: id, isPublished: true }, { $inc: { clicks: 1 } });
    if (!cta) throw ApiError.notFound('CTA not found');
    const date = new Date().toISOString().slice(0, 10);
    await CtaStat.updateOne({ cta: cta._id, date }, { $inc: { clicks: 1 } }, { upsert: true });
    return res.status(204).end();
  }),
);

export default router;
