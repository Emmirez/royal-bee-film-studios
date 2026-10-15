import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, escapeRegex } from '../../utils/http.js';
import { searchLimiter } from '../../middleware/rateLimiters.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { Service } from '../../models/Service.js';
import { Production } from '../../models/Production.js';
import { NewsPost } from '../../models/NewsPost.js';
import { Founder } from '../../models/Founder.js';
import { SearchStat } from '../../models/SearchLog.js';
import { publicServicesFilter, publicProductionsFilter, publicNewsFilter } from './public.queries.js';
import { serviceCard, productionCard, newsCard } from './public.serializers.js';

/**
 * Public search — ONLY published, publicly-listed content. Never touches staff,
 * client, enquiry, unreleased or private records. Kept separate from staff search.
 */
const router = Router();
router.use(searchLimiter);

const searchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  type: z.enum(['all', 'services', 'productions', 'news', 'founder']).optional().default('all'),
  sort: z.enum(['relevance', 'newest']).optional().default('relevance'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});

/** Rank: exact title > title starts with > title contains > other field match. */
export function rank(title = '', q = '') {
  const t = title.toLowerCase();
  const n = q.toLowerCase();
  if (t === n) return 0;
  if (t.startsWith(n)) return 1;
  if (t.includes(n)) return 2;
  return 3;
}

async function runSearch({ q, type, sort, limit }) {
  const settings = await SiteSettings.getMain();
  const enabled = settings.search || {};
  const rx = new RegExp(escapeRegex(q), 'i');
  const want = (key) => (type === 'all' || type === key) && enabled[key] !== false;

  const sortFn = (field) => (a, b) =>
    sort === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : rank(a[field], q) - rank(b[field], q);

  const [services, productions, news, founderDoc] = await Promise.all([
    want('services')
      ? Service.find({ ...publicServicesFilter(), $or: [{ title: rx }, { summary: rx }, { description: rx }] }).limit(40).lean()
      : [],
    want('productions')
      ? Production.find({ ...publicProductionsFilter(), $or: [{ title: rx }, { logline: rx }, { tags: rx }, { category: rx }] }).limit(40).lean()
      : [],
    want('news')
      ? NewsPost.find({ ...publicNewsFilter(), $or: [{ title: rx }, { excerpt: rx }, { tags: rx }, { category: rx }] }).limit(40).lean()
      : [],
    want('founder') ? Founder.findOne({ key: 'main' }).lean() : null,
  ]);

  const founder = founderDoc?.published;
  const founderHit =
    founder && [founder.name, founder.title, founder.shortBio, ...(founder.biography || [])].some((t) => rx.test(t || ''))
      ? [{ name: founder.name, title: founder.title, href: '/about/founder', portrait: founder.portrait?.url ? founder.portrait : null }]
      : [];

  return {
    services: services.sort(sortFn('title')).slice(0, limit).map((s) => ({ ...serviceCard(s), href: `/services/${s.slug}` })),
    productions: productions.sort(sortFn('title')).slice(0, limit).map((p) => ({ ...productionCard(p), href: `/productions/${p.slug}` })),
    news: news.sort(sortFn('title')).slice(0, limit).map((n) => ({ ...newsCard(n), href: `/news/${n.slug}` })),
    founder: founderHit,
  };
}

async function recordSearch(term, total) {
  const date = new Date().toISOString().slice(0, 10);
  await SearchStat.updateOne(
    { term: term.toLowerCase().slice(0, 100), date },
    { $inc: { count: 1, zeroResultCount: total === 0 ? 1 : 0 } },
    { upsert: true },
  ).catch(() => {});
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = searchQuery.parse(req.query);
    const results = await runSearch(params);
    const total = results.services.length + results.productions.length + results.news.length + results.founder.length;
    recordSearch(params.q, total);
    return ok(res, { query: params.q, total, results });
  }),
);

/** Autocomplete — titles only, fast, not recorded in analytics. */
router.get(
  '/suggest',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return ok(res, []);
    const rx = new RegExp(`(^|\\s)${escapeRegex(q)}`, 'i');
    const [services, productions, news] = await Promise.all([
      Service.find({ ...publicServicesFilter(), title: rx }).select('title slug').limit(4).lean(),
      Production.find({ ...publicProductionsFilter(), title: rx }).select('title slug category').limit(5).lean(),
      NewsPost.find({ ...publicNewsFilter(), title: rx }).select('title slug').limit(3).lean(),
    ]);
    return ok(res, [
      ...services.map((s) => ({ label: s.title, type: 'Service', href: `/services/${s.slug}` })),
      ...productions.map((p) => ({ label: p.title, type: p.category || 'Production', href: `/productions/${p.slug}` })),
      ...news.map((n) => ({ label: n.title, type: 'News', href: `/news/${n.slug}` })),
    ]);
  }),
);

/** Popular searches for empty states (aggregate counts only). */
router.get(
  '/popular',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const rows = await SearchStat.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: '$term', count: { $sum: '$count' }, zero: { $sum: '$zeroResultCount' } } },
      { $match: { $expr: { $lt: ['$zero', '$count'] } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    return ok(res, rows.map((r) => r._id));
  }),
);

export default router;
