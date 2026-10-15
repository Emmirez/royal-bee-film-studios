import { z } from 'zod';
import { AVAILABILITY, CASTING_STATUSES, DOCUMENT_KIND_KEYS, TALENT_STATUSES, TALENT_TYPE_KEYS, MAX_TALENT_PHOTOS } from '../../constants/talent.js';
import { CURRENCIES } from '../../constants/billing.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const optionalDate = z.preprocess((v) => (v === '' || v === null ? null : v), z.coerce.date().nullable().optional());
const optionalNumber = (min, max) => z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.number().min(min).max(max).nullable()).optional();
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), 'Use a full link starting with https://');
const tagList = (max) => z.array(z.string().trim().min(1).max(60)).max(max);
const photo = z.object({
  url: z.string().trim().url().max(1000),
  publicId: z.string().trim().max(300).optional().default(''),
  alt: z.string().trim().max(250).optional().default(''),
  width: z.number().optional(),
  height: z.number().optional(),
});

/** Profile fields talent can edit themselves (and staff can edit too). */
export const profileFields = {
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  stageName: z.string().trim().max(100),
  phone: z.string().trim().max(30),
  talentTypes: z.array(z.enum(TALENT_TYPE_KEYS)).min(1, 'Choose at least one').max(TALENT_TYPE_KEYS.length),
  bio: z.string().trim().max(1500),
  city: z.string().trim().max(80),
  country: z.string().trim().max(80),
  languages: tagList(15),
  skills: tagList(30),
  gender: z.string().trim().max(40),
  playingAgeMin: optionalNumber(18, 100),
  playingAgeMax: optionalNumber(18, 100),
  heightCm: optionalNumber(50, 250),
  build: z.string().trim().max(40),
  hairColour: z.string().trim().max(40),
  eyeColour: z.string().trim().max(40),
  showreels: z.array(z.object({ title: z.string().trim().max(120).optional().default(''), url })).max(6),
  dayRate: z.object({ amount: optionalNumber(0, 1_000_000_000), currency: z.enum(CURRENCIES).default('NGN') }),
  rateNotes: z.string().trim().max(300),
  availability: z.object({ status: z.enum(AVAILABILITY), note: z.string().trim().max(300).default('') }),
};

const ageRangeOk = (d) => !d.playingAgeMin || !d.playingAgeMax || d.playingAgeMin <= d.playingAgeMax;
const ageRangeIssue = { message: 'The lowest age must be below the highest', path: ['playingAgeMax'] };

/** Public application form (website). */
export const applySchema = z
  .object({
    firstName: profileFields.firstName,
    lastName: profileFields.lastName,
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
    phone: z.string().trim().min(6, 'Enter a phone number').max(30),
    stageName: profileFields.stageName.optional().default(''),
    talentTypes: profileFields.talentTypes,
    city: z.string().trim().min(2, 'Enter your city').max(80),
    country: profileFields.country.optional().default(''),
    bio: profileFields.bio.optional().default(''),
    languages: profileFields.languages.optional().default([]),
    skills: profileFields.skills.optional().default([]),
    gender: profileFields.gender.optional().default(''),
    playingAgeMin: profileFields.playingAgeMin,
    playingAgeMax: profileFields.playingAgeMax,
    heightCm: profileFields.heightCm,
    showreels: profileFields.showreels.optional().default([]),
    message: z.string().trim().max(2000).optional().default(''),
    photoTokens: z.array(z.string().max(3000)).max(6).optional().default([]),
    ageConfirmed: z.literal(true, { errorMap: () => ({ message: 'You must be 18 or older to apply' }) }),
    privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the privacy notice' }) }),
    website: z.string().optional().default(''), // honeypot
    formStartedAt: z.coerce.number().optional(),
  })
  .refine(ageRangeOk, ageRangeIssue);

/** Talent editing their own profile. Photos can only be reordered/removed here (uploads use their own endpoint). */
export const selfUpdateSchema = z
  .object({ ...profileFields, photos: z.array(photo).max(MAX_TALENT_PHOTOS) })
  .partial()
  .strict()
  .refine(ageRangeOk, ageRangeIssue);

/** Staff editing a profile. */
export const staffUpdateSchema = z
  .object({ ...profileFields, email: z.string().trim().toLowerCase().email().max(254), photos: z.array(photo).max(MAX_TALENT_PHOTOS), internalNotes: z.string().trim().max(3000) })
  .partial()
  .strict()
  .refine(ageRangeOk, ageRangeIssue);

export const listTalentQuery = z.object({
  status: z.enum(TALENT_STATUSES).optional(),
  type: z.enum(TALENT_TYPE_KEYS).optional(),
  availability: z.enum(AVAILABILITY).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const rejectSchema = z.object({ reason: z.string().trim().max(500).optional().default(''), notify: z.boolean().optional().default(true) });

/* ───────── Casting calls ───────── */

const castingFields = {
  title: z.string().trim().min(3, 'Give the casting a title').max(160),
  description: z.string().trim().max(4000).optional().default(''),
  requirements: z.string().trim().max(2000).optional().default(''),
  talentTypes: z.array(z.enum(TALENT_TYPE_KEYS)).max(TALENT_TYPE_KEYS.length).optional().default([]),
  projectId: objectId.nullable().optional(),
  location: z.string().trim().max(160).optional().default(''),
  shootDates: z.string().trim().max(160).optional().default(''),
  fee: z.string().trim().max(160).optional().default(''),
  applyBy: optionalDate,
};
export const castingSchema = z.object(castingFields);
export const castingUpdateSchema = z
  .object({ ...castingFields, status: z.enum(CASTING_STATUSES) })
  .partial();
export const publishSchema = z.object({ notify: z.boolean().optional().default(true) });
export const listCastingQuery = z.object({
  status: z.enum(CASTING_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export const applicationUpdateSchema = z.object({
  status: z.enum(['applied', 'shortlisted', 'declined']).optional(),
  staffNote: z.string().trim().max(1500).optional(),
  notify: z.boolean().optional().default(true),
});
export const applyToCastingSchema = z.object({ note: z.string().trim().max(1500).optional().default('') });

/* ───────── Bookings ───────── */

const bookingFields = {
  talentId: objectId,
  projectId: objectId.nullable().optional(),
  castingApplicationId: objectId.nullable().optional(),
  role: z.string().trim().min(2, 'What is the role or job?').max(160),
  details: z.string().trim().max(3000).optional().default(''),
  startDate: z.coerce.date({ errorMap: () => ({ message: 'Choose the first day' }) }),
  endDate: optionalDate,
  callTime: z.string().trim().max(60).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  fee: z
    .object({ amount: optionalNumber(0, 1_000_000_000_000), currency: z.enum(CURRENCIES).default('NGN'), note: z.string().trim().max(200).optional().default('') })
    .optional()
    .default({ amount: null, currency: 'NGN', note: '' }),
};
const datesOk = (d) => !d.endDate || !d.startDate || d.endDate >= d.startDate;
const datesIssue = { message: 'The last day can’t be before the first day', path: ['endDate'] };

export const bookingSchema = z.object(bookingFields).refine(datesOk, datesIssue);
export const bookingUpdateSchema = z
  .object({
    projectId: bookingFields.projectId,
    role: bookingFields.role,
    details: z.string().trim().max(3000),
    startDate: bookingFields.startDate,
    endDate: optionalDate,
    callTime: z.string().trim().max(60),
    location: z.string().trim().max(200),
    fee: bookingFields.fee,
  })
  .partial()
  .refine(datesOk, datesIssue);
export const listBookingQuery = z.object({
  status: z.enum(['offered', 'confirmed', 'declined', 'cancelled', 'completed', 'upcoming']).optional(),
  talentId: objectId.optional(),
  projectId: objectId.optional(),
  awaiting: z.enum(['reply']).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export const cancelSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(1000) });
export const respondSchema = z
  .object({ decision: z.enum(['confirmed', 'declined']), reason: z.string().trim().max(1000).optional().default('') })
  .refine((d) => d.decision === 'confirmed' || d.reason.length >= 3, { message: 'Let the studio know why (a few words is fine)', path: ['reason'] });
export const staffMessageSchema = z.object({ body: z.string().trim().min(1, 'Write a message').max(5000), internal: z.boolean().optional().default(false) });
export const talentMessageSchema = z.object({ body: z.string().trim().min(1, 'Write a message').max(5000) });

/* ───────── Documents (multipart fields arrive as strings) ───────── */

export const documentFieldsSchema = z.object({
  kind: z.enum(DOCUMENT_KIND_KEYS).optional().default('other'),
  title: z.string().trim().max(160).optional().default(''),
  bookingId: z.preprocess((v) => (v === '' ? undefined : v), objectId.optional()),
});