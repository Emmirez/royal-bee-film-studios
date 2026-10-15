/**
 * Seed roles + starter website content.
 *
 *   npm run seed          → creates roles; adds starter content only if the CMS is empty
 *   npm run seed:reset    → ALSO wipes and re-creates website content (never touches users, enquiries or audit)
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { DEFAULT_ROLES, ALL_PERMISSIONS } from '../src/constants/permissions.js';
import { Role } from '../src/models/Role.js';
import { SiteSettings } from '../src/models/SiteSettings.js';
import { Hero } from '../src/models/Hero.js';
import { Founder } from '../src/models/Founder.js';
import { FounderImage } from '../src/models/FounderImage.js';
import { TickerItem } from '../src/models/TickerItem.js';
import { GalleryImage } from '../src/models/GalleryImage.js';
import { Service } from '../src/models/Service.js';
import { Production } from '../src/models/Production.js';
import { NewsPost } from '../src/models/NewsPost.js';
import { HomeSection } from '../src/models/HomeSection.js';
import { CallToAction } from '../src/models/CallToAction.js';
import { slugify } from '../src/utils/slugify.js';
import * as C from './seed/content.js';

const reset = process.argv.includes('--reset');
const log = (...args) => console.log('  •', ...args);

const published = () => ({ status: 'published', publishedAt: new Date(), reviewHistory: [{ action: 'seeded', toStatus: 'published' }] });

async function seedRoles() {
  for (const def of DEFAULT_ROLES) {
    const existing = await Role.findOne({ key: def.key });
    if (!existing) {
      await Role.create(def);
      log(`role created: ${def.name}`);
    } else if (def.isSuperAdmin) {
      existing.permissions = ALL_PERMISSIONS; // keep Super Admin in sync with new permissions
      existing.isSuperAdmin = true;
      existing.requiresMfa = true;
      await existing.save();
    }
  }
}

async function wipeContent() {
  await Promise.all(
    [Hero, Founder, FounderImage, TickerItem, GalleryImage, Service, Production, NewsPost, HomeSection, CallToAction].map((M) =>
      M.deleteMany({}),
    ),
  );
  log('website content cleared');
}

async function seedContent() {
  // Settings
  const settings = await SiteSettings.getMain();
  settings.set({
    studioName: C.settings.studioName,
    tagline: C.settings.tagline,
    logo: C.settings.logo,
    contact: { ...settings.contact.toObject(), ...C.settings.contact },
    seo: C.settings.seo,
    footer: C.settings.footer,
    enquiry: { ...settings.enquiry.toObject(), ...C.settings.enquiry },
  });
  await settings.save();
  log('site settings');

  // Services
  const serviceDocs = [];
  for (const [i, s] of C.services.entries()) {
    const { key, questions, ...data } = s;
    serviceDocs.push(
      await Service.create({
        ...data,
        slug: slugify(s.title),
        order: i,
        enquiryQuestions: questions,
        cta: { label: 'Start a project', href: `/enquire?service=${slugify(s.title)}`, variant: 'primary' },
        startingPrice: { amount: null, visible: false },
        ...published(),
      }),
    );
  }
  log(`${serviceDocs.length} services`);

  const serviceByCategory = {
    'Feature Film': 'film', 'Short Film': 'film', Series: 'film', Commercial: 'commercial',
    Documentary: 'documentary', 'Music Video': 'music',
  };
  const serviceKeyIndex = Object.fromEntries(C.services.map((s, i) => [s.key, i]));

  // Productions
  const productionDocs = [];
  for (const [i, p] of C.productions.entries()) {
    const svc = serviceDocs[serviceKeyIndex[serviceByCategory[p.category]]];
    productionDocs.push(
      await Production.create({
        ...p,
        slug: slugify(p.title),
        synopsis: `${p.logline} This is placeholder synopsis text — replace it with the real production details in the CMS.`,
        credits: [
          { role: 'Director', name: 'Credit placeholder' },
          { role: 'Producer', name: 'Credit placeholder' },
        ],
        gallery: [
          { kind: 'image', image: C.gallery[i % C.gallery.length].image, caption: 'Production still (placeholder)' },
          { kind: 'image', image: C.gallery[(i + 3) % C.gallery.length].image, caption: 'Production still (placeholder)' },
        ],
        behindTheScenes: [{ kind: 'image', image: C.ticker[(i + 2) % C.ticker.length].image, caption: 'Behind the scenes (placeholder)' }],
        services: svc ? [svc._id] : [],
        visibility: 'public',
        isPlaceholder: true,
        order: i,
        ...published(),
      }),
    );
  }
  log(`${productionDocs.length} productions (flagged as samples)`);

  // Link service portfolios
  for (const svc of serviceDocs) {
    const portfolio = productionDocs.filter((p) => p.services.some((id) => String(id) === String(svc._id))).map((p) => p._id);
    if (portfolio.length) await Service.updateOne({ _id: svc._id }, { portfolio });
  }

  // News (dated a few days apart)
  for (const [i, n] of C.news.entries()) {
    const date = new Date(Date.now() - i * 5 * 864e5);
    await NewsPost.create({ ...n, slug: slugify(n.title), isPlaceholder: true, ...published(), publishedAt: date, publishAt: date });
  }
  log(`${C.news.length} news articles (flagged as samples)`);

  // Hero & founder — draft AND published
  await Hero.create({ key: 'main', draft: C.hero, published: C.hero, hasUnpublishedChanges: false, publishedAt: new Date() });
  const founderData = { ...C.founder, relatedProductions: productionDocs.slice(0, 3).map((p) => p._id) };
  await Founder.create({ key: 'main', draft: founderData, published: founderData, hasUnpublishedChanges: false, publishedAt: new Date() });
  log('hero video + founder profile');

  // Image collections
  await FounderImage.insertMany(C.founderGallery.map((g, i) => ({ ...g, order: i, isPublished: true })));
  await TickerItem.insertMany(
    C.ticker.map(({ productionIndex, ...t }, i) => ({
      ...t,
      order: i,
      isPublished: true,
      link: productionIndex !== undefined ? { type: 'production', production: productionDocs[productionIndex]._id } : { type: 'none' },
    })),
  );
  await GalleryImage.insertMany(C.gallery.map((g, i) => ({ ...g, order: i, isPublished: true })));
  log(`${C.founderGallery.length} founder photos, ${C.ticker.length} ticker images, ${C.gallery.length} gallery photos`);

  // Homepage sections
  const sections = C.homeSections({ featuredProductions: productionDocs.filter((p) => p.isFeatured).map((p) => String(p._id)) });
  await HomeSection.insertMany(sections.map((s, i) => ({ ...s, order: i, enabled: true, theme: s.theme || 'light', ...published() })));
  log(`${sections.length} homepage sections`);

  await CallToAction.insertMany(C.ctas.map((c, i) => ({ ...c, order: i, isPublished: true })));
  log(`${C.ctas.length} calls to action`);
}

async function main() {
  await connectDatabase();
  console.log('\nSeeding Royal Bee Film Studios…');
  await seedRoles();

  if (reset) await wipeContent();
  const hasContent = await Service.exists({});
  if (hasContent && !reset) {
    log('website content already exists — skipped (use `npm run seed:reset` to replace it)');
  } else {
    await seedContent();
  }
  console.log('\nDone. Next: `npm run create-admin` to create the first Super Admin.\n');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
