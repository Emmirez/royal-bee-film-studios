/**
 * Public serializers — the ONLY shape the public website receives.
 * They strip workflow/audit fields, hidden prices, unapproved testimonials,
 * unverified achievements and client names without permission.
 */

const INTERNAL_FIELDS = ['reviewHistory', 'createdBy', 'updatedBy', '__v', 'status', 'enquiryQuestions'];

export function stripInternal(doc) {
  if (!doc) return doc;
  const out = { ...doc };
  for (const f of INTERNAL_FIELDS) delete out[f];
  return out;
}

const imageOut = (img) => (img && img.url ? { url: img.url, publicId: img.publicId || '', alt: img.alt || '', width: img.width, height: img.height, isPlaceholder: Boolean(img.isPlaceholder) } : null);

export function serviceCard(s) {
  return {
    id: s._id,
    title: s.title,
    slug: s.slug,
    summary: s.summary,
    icon: s.icon,
    coverImage: imageOut(s.coverImage),
    isFeatured: Boolean(s.isFeatured),
    startingPrice: s.startingPrice?.visible && s.startingPrice.amount != null
      ? { amount: s.startingPrice.amount, currency: s.startingPrice.currency, note: s.startingPrice.note }
      : null,
  };
}

export function serviceDetail(s) {
  return {
    ...serviceCard(s),
    description: s.description,
    benefits: s.benefits || [],
    process: s.process || [],
    deliverables: s.deliverables || [],
    packages: (s.packages || []).map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      features: p.features || [],
      isFeatured: Boolean(p.isFeatured),
      priceLabel: p.priceLabel,
      price: p.priceVisible ? p.price : null,
      currency: p.priceVisible ? p.currency : null,
    })),
    addOns: (s.addOns || []).map((a) => ({
      id: a._id,
      name: a.name,
      description: a.description,
      price: a.priceVisible ? a.price : null,
    })),
    faqs: (s.faqs || []).map((f) => ({ id: f._id, question: f.question, answer: f.answer })),
    testimonials: (s.testimonials || []).filter((t) => t.approved).map((t) => ({ quote: t.quote, author: t.author, role: t.role })),
    cta: s.cta,
    seo: s.seo,
  };
}

export function productionCard(p) {
  return {
    id: p._id,
    title: p.title,
    slug: p.slug,
    logline: p.logline,
    category: p.category,
    year: p.year,
    coverImage: imageOut(p.coverImage),
    isFeatured: Boolean(p.isFeatured),
    isPlaceholder: Boolean(p.isPlaceholder),
    hasTrailer: Boolean(p.trailer && p.trailer.type !== 'none' && (p.trailer.url || p.trailer.publicId)),
  };
}

export function productionDetail(p) {
  return {
    ...productionCard(p),
    synopsis: p.synopsis,
    tags: p.tags || [],
    releaseDate: p.releaseDate,
    runtimeMinutes: p.runtimeMinutes,
    client: p.showClientName ? p.clientName : null,
    credits: p.credits || [],
    trailer: p.trailer?.type && p.trailer.type !== 'none' ? p.trailer : null,
    gallery: (p.gallery || []).map((m) => ({ id: m._id, kind: m.kind, image: imageOut(m.image), video: m.video, caption: m.caption })),
    behindTheScenes: (p.behindTheScenes || []).map((m) => ({ id: m._id, kind: m.kind, image: imageOut(m.image), video: m.video, caption: m.caption })),
    services: (p.services || []).filter((s) => s && s.slug).map((s) => ({ title: s.title, slug: s.slug })),
    seo: p.seo,
  };
}

export function newsCard(n) {
  return {
    id: n._id,
    title: n.title,
    slug: n.slug,
    excerpt: n.excerpt,
    category: n.category,
    coverImage: imageOut(n.coverImage),
    authorName: n.authorName,
    isFeatured: Boolean(n.isFeatured),
    isPlaceholder: Boolean(n.isPlaceholder),
    publishedAt: n.publishAt || n.publishedAt,
  };
}

export function newsDetail(n) {
  return { ...newsCard(n), body: n.body || [], tags: n.tags || [], seo: n.seo };
}

export function founderPublic(f, { full = true } = {}) {
  if (!f) return null;
  const summary = {
    name: f.name,
    title: f.title,
    portrait: imageOut(f.portrait),
    spotlightEyebrow: f.spotlightEyebrow,
    spotlightHeading: f.spotlightHeading,
    shortBio: f.shortBio,
    quote: f.quote,
    isPlaceholder: Boolean(f.isPlaceholder),
  };
  if (!full) return summary;
  return {
    ...summary,
    coverImage: imageOut(f.coverImage),
    biography: f.biography || [],
    vision: f.vision,
    philosophy: f.philosophy,
    experience: f.experience || [],
    // Never show unverified achievements publicly.
    achievements: (f.achievements || []).filter((a) => a.verified).map(({ title, year, description }) => ({ title, year, description })),
    mediaAppearances: f.mediaAppearances || [],
    links: f.links || [],
    cta: f.cta,
    seo: f.seo,
  };
}

export function imageItem(i) {
  return {
    id: i._id,
    image: imageOut(i.image),
    caption: i.caption,
    description: i.description,
    category: i.category,
    isFeatured: Boolean(i.isFeatured),
    production: i.production && i.production.slug ? { title: i.production.title, slug: i.production.slug } : null,
  };
}

export function tickerItem(t) {
  let link = null;
  if (t.link?.type === 'production' && t.link.production?.slug) link = { type: 'production', href: `/productions/${t.link.production.slug}` };
  else if (t.link?.type === 'gallery' && t.link.galleryImage) link = { type: 'gallery', href: `/gallery?image=${t.link.galleryImage._id || t.link.galleryImage}` };
  else if (t.link?.type === 'url' && t.link.url) link = { type: 'url', href: t.link.url };
  return { id: t._id, image: imageOut(t.image), caption: t.caption, category: t.category, link };
}

export function heroPublic(h) {
  if (!h) return null;
  return {
    eyebrow: h.eyebrow,
    headline: h.headline,
    subheadline: h.subheadline,
    video: h.video,
    posterImage: imageOut(h.posterImage),
    mobileBehavior: h.mobileBehavior,
    overlayOpacity: h.overlayOpacity,
    textAlign: h.textAlign,
    ctas: (h.ctas || []).filter((c) => c.label && c.href),
    showScrollCue: h.showScrollCue,
  };
}

export function settingsPublic(s) {
  return {
    studioName: s.studioName,
    tagline: s.tagline,
    logo: imageOut(s.logo),
    contact: s.contact,
    social: s.social,
    seo: s.seo,
    footer: s.footer,
    ticker: s.ticker,
    enquiry: { budgetRanges: s.enquiry?.budgetRanges || [], currency: s.enquiry?.currency, privacyNotice: s.enquiry?.privacyNotice },
    analytics: s.analytics,
  };
}
