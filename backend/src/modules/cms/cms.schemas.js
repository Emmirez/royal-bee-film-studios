import { z } from 'zod';
import {
  HOME_SECTION_TYPES,
  PRODUCTION_CATEGORIES,
  FOUNDER_IMAGE_CATEGORIES,
  GALLERY_CATEGORIES,
  CTA_PLACEMENTS,
} from '../../constants/content.js';

/* ───────── Shared building blocks ───────── */

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

/** Absolute http(s) URL or a site-relative path like /images/hero-video.mp4 */
export const urlOrPath = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), 'Must be a URL or a path starting with /')
  .refine((v) => !/^\s*javascript:/i.test(v), 'Invalid URL');

/** Link target: URL, site path, mailto:, tel: or #anchor */
export const href = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(v),
    'Use a full URL, a path starting with /, #anchor, mailto: or tel:',
  );

export const image = z.object({
  url: urlOrPath.default(''),
  publicId: z.string().trim().max(300).optional().default(''),
  alt: z.string().trim().max(250).optional().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  isPlaceholder: z.boolean().optional(),
});

export const video = z.object({
  type: z.enum(['none', 'local', 'cloudinary', 'youtube', 'vimeo', 'url']).default('none'),
  url: urlOrPath.optional().default(''),
  publicId: z.string().trim().max(300).optional().default(''),
  mobileUrl: urlOrPath.optional().default(''),
});

export const seo = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(170).optional(),
  ogImage: image.optional(),
  noIndex: z.boolean().optional(),
  canonicalUrl: z.string().trim().max(500).optional(),
});

export const ctaLink = z.object({
  label: z.string().trim().max(60).default(''),
  href: href.default(''),
  variant: z.enum(['primary', 'secondary', 'ghost']).default('primary'),
});

const shortText = (max) => z.string().trim().max(max);
const stringList = (maxItems, maxLen) => z.array(z.string().trim().max(maxLen)).max(maxItems);
const schedule = {
  publishAt: z.coerce.date().nullable().optional(),
  expireAt: z.coerce.date().nullable().optional(),
};

/* ───────── Services ───────── */

export const serviceSchema = z.object({
  title: shortText(120).min(2, 'Title is required'),
  slug: shortText(90).optional(),
  summary: shortText(300).optional(),
  description: shortText(6000).optional(),
  icon: shortText(40).optional(),
  coverImage: image.optional(),
  benefits: stringList(20, 200).optional(),
  process: z.array(z.object({ title: shortText(80), description: shortText(500).optional().default('') })).max(12).optional(),
  deliverables: stringList(30, 200).optional(),
  startingPrice: z
    .object({
      amount: z.number().min(0).nullable().optional(),
      currency: shortText(3).optional(),
      visible: z.boolean().optional(),
      note: shortText(140).optional(),
    })
    .optional(),
  packages: z
    .array(
      z.object({
        name: shortText(80),
        description: shortText(400).optional(),
        price: z.number().min(0).nullable().optional(),
        currency: shortText(3).optional(),
        priceLabel: shortText(60).optional(),
        priceVisible: z.boolean().optional(),
        features: stringList(20, 160).optional(),
        isFeatured: z.boolean().optional(),
      }),
    )
    .max(8)
    .optional(),
  addOns: z
    .array(
      z.object({
        name: shortText(80),
        description: shortText(300).optional(),
        price: z.number().min(0).nullable().optional(),
        priceVisible: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
  faqs: z.array(z.object({ question: shortText(200), answer: shortText(1500) })).max(30).optional(),
  testimonials: z
    .array(z.object({ quote: shortText(600), author: shortText(80), role: shortText(120).optional(), approved: z.boolean().optional() }))
    .max(20)
    .optional(),
  portfolio: z.array(objectId).max(24).optional(),
  enquiryQuestions: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and _'),
        label: shortText(160),
        type: z.enum(['text', 'textarea', 'number', 'select', 'multiselect', 'date', 'boolean']).default('text'),
        options: stringList(30, 100).optional(),
        required: z.boolean().optional(),
        helpText: shortText(200).optional(),
      }),
    )
    .max(15)
    .optional(),
  cta: ctaLink.optional(),
  seo: seo.optional(),
  order: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  ...schedule,
});

/* ───────── Productions ───────── */

const mediaItem = z.object({
  kind: z.enum(['image', 'video']).default('image'),
  image: image.optional(),
  video: video.optional(),
  caption: shortText(240).optional(),
});

export const productionSchema = z.object({
  title: shortText(160).min(2, 'Title is required'),
  slug: shortText(90).optional(),
  logline: shortText(300).optional(),
  synopsis: shortText(6000).optional(),
  category: z.enum(PRODUCTION_CATEGORIES).optional(),
  tags: stringList(20, 40).optional(),
  year: z.number().int().min(1900).max(2200).nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  runtimeMinutes: z.number().int().min(0).max(2000).nullable().optional(),
  clientName: shortText(120).optional(),
  showClientName: z.boolean().optional(),
  credits: z.array(z.object({ role: shortText(80), name: shortText(120) })).max(60).optional(),
  coverImage: image.optional(),
  trailer: video.optional(),
  gallery: z.array(mediaItem).max(60).optional(),
  behindTheScenes: z.array(mediaItem).max(60).optional(),
  services: z.array(objectId).max(20).optional(),
  relatedProductions: z.array(objectId).max(12).optional(),
  isFeatured: z.boolean().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  isPlaceholder: z.boolean().optional(),
  seo: seo.optional(),
  order: z.number().int().min(0).optional(),
  ...schedule,
});

/* ───────── News ───────── */

export const newsSchema = z.object({
  title: shortText(180).min(2, 'Title is required'),
  slug: shortText(90).optional(),
  excerpt: shortText(400).optional(),
  body: z
    .array(
      z.object({
        type: z.enum(['paragraph', 'heading', 'quote', 'image']).default('paragraph'),
        text: shortText(6000).optional().default(''),
        image: image.optional(),
      }),
    )
    .max(200)
    .optional(),
  coverImage: image.optional(),
  category: shortText(60).optional(),
  tags: stringList(20, 40).optional(),
  authorName: shortText(80).optional(),
  isFeatured: z.boolean().optional(),
  isPlaceholder: z.boolean().optional(),
  seo: seo.optional(),
  ...schedule,
});

/* ───────── Homepage sections ───────── */

export const homeSectionSchema = z.object({
  type: z.enum(HOME_SECTION_TYPES),
  name: shortText(80).min(1),
  enabled: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  layout: shortText(40).optional(),
  theme: z.enum(['light', 'warm', 'dark']).optional(),
  content: z.record(z.any()).optional(),
  ...schedule,
});

/* ───────── Image collections (simple publish) ───────── */

export const tickerItemSchema = z.object({
  image: image.refine((i) => i.url, 'An image is required'),
  caption: shortText(140).optional(),
  category: z.enum(['production', 'behind_the_scenes', 'film_set', 'studio']).optional(),
  link: z
    .object({
      type: z.enum(['none', 'production', 'gallery', 'url']).default('none'),
      production: objectId.nullable().optional(),
      galleryImage: objectId.nullable().optional(),
      url: href.optional(),
    })
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const founderImageSchema = z.object({
  image: image.refine((i) => i.url, 'An image is required'),
  caption: shortText(240).optional(),
  category: z.enum(FOUNDER_IMAGE_CATEGORIES).optional(),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const galleryImageSchema = z.object({
  image: image.refine((i) => i.url, 'An image is required'),
  caption: shortText(240).optional(),
  description: shortText(1000).optional(),
  category: z.enum(GALLERY_CATEGORIES).optional(),
  production: objectId.nullable().optional(),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

/* ───────── Calls to action ───────── */

export const ctaSchema = z.object({
  name: shortText(80).min(1),
  label: shortText(60).min(1),
  description: shortText(200).optional(),
  href: href.refine((v) => v.length > 0, 'Destination is required'),
  placement: z.enum(CTA_PLACEMENTS),
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
  context: z
    .object({ service: objectId.nullable().optional(), production: objectId.nullable().optional() })
    .optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

/* ───────── Singletons ───────── */

export const heroSchema = z
  .object({
    eyebrow: shortText(80),
    headline: shortText(140),
    subheadline: shortText(320),
    video,
    posterImage: image,
    mobileBehavior: z.enum(['poster', 'mobile_video', 'full_video']),
    overlayOpacity: z.number().int().min(0).max(90),
    textAlign: z.enum(['left', 'center']),
    ctas: z.array(ctaLink).max(3),
    showScrollCue: z.boolean(),
  })
  .partial()
  .refine(
    (h) => !h.video || h.video.type === 'none' || h.video.url || h.video.publicId,
    'Add a video URL, upload a video, or choose "none"',
  );

export const partnerPageSchema = z
  .object({
    eyebrow: shortText(60),
    heading: shortText(160),
    intro: shortText(600),
    image,
    typesHeading: shortText(80),
    types: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(40).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and _ only'),
          title: shortText(80).min(1, 'Add a title'),
          description: shortText(400).optional().default(''),
        }),
      )
      .max(10),
    stepsHeading: shortText(80),
    steps: z.array(z.object({ title: shortText(80), description: shortText(300).optional().default('') })).max(6),
    formHeading: shortText(120),
    formIntro: shortText(300),
    successMessage: shortText(300),
  })
  .partial();

export const founderSchema = z
  .object({
    name: shortText(120),
    title: shortText(120),
    portrait: image,
    coverImage: image,
    spotlightEyebrow: shortText(60),
    spotlightHeading: shortText(160),
    shortBio: shortText(700),
    quote: shortText(400),
    biography: z.array(shortText(4000)).max(20),
    vision: shortText(2000),
    philosophy: shortText(2000),
    experience: z
      .array(z.object({ role: shortText(120), organization: shortText(120).optional(), period: shortText(60).optional(), description: shortText(800).optional() }))
      .max(30),
    achievements: z
      .array(
        z.object({
          title: shortText(160),
          year: shortText(10).optional(),
          description: shortText(600).optional(),
          verified: z.boolean().optional(),
          evidenceUrl: shortText(500).optional(),
        }),
      )
      .max(40),
    mediaAppearances: z
      .array(
        z.object({
          title: shortText(200),
          outlet: shortText(120).optional(),
          type: z.enum(['interview', 'article', 'podcast', 'tv', 'panel', 'publication', 'other']).optional(),
          date: z.coerce.date().nullable().optional(),
          url: href.optional(),
        }),
      )
      .max(40),
    links: z.array(z.object({ label: shortText(60), url: href, platform: shortText(30).optional() })).max(15),
    relatedProductions: z.array(objectId).max(12),
    cta: ctaLink,
    seo,
    isPlaceholder: z.boolean(),
  })
  .partial();
