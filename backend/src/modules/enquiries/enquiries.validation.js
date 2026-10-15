import { z } from 'zod';
import { ENQUIRY_STATUSES } from '../../models/Enquiry.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

const spamFields = {
  website: z.string().max(200).optional(), // honeypot — must stay empty
  formStartedAt: z.coerce.number().optional(),
};

export const submitEnquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email,
  phone: z.string().trim().max(30).optional().default(''),
  organization: z.string().trim().max(160).optional().default(''),
  serviceId: objectId.nullable().optional(),
  projectTitle: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().min(20, 'Tell us a little more about the project (at least 20 characters)').max(5000),
  budgetRange: z.string().trim().max(60).optional().default(''),
  budgetAmount: z.coerce.number().min(0).max(1e13).nullable().optional(),
  preferredStartDate: z.coerce.date().nullable().optional(),
  preferredEndDate: z.coerce.date().nullable().optional(),
  datesFlexible: z.boolean().optional().default(true),
  location: z.string().trim().max(200).optional().default(''),
  deliverables: z.array(z.string().trim().max(120)).max(20).optional().default([]),
  answers: z.record(z.union([z.string().max(2000), z.number(), z.boolean(), z.array(z.string().max(200)).max(30), z.null()])).optional().default({}),
  attachmentTokens: z.array(z.string().max(2000)).max(5).optional().default([]),
  preferredContactMethod: z.enum(['email', 'phone', 'any']).optional().default('email'),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the privacy notice to continue' }) }),
  marketingConsent: z.boolean().optional().default(false),
  draftToken: z.string().max(200).optional(),
  sourcePage: z.string().max(300).optional().default(''),
  utm: z.object({ source: z.string().max(100), medium: z.string().max(100), campaign: z.string().max(100) }).partial().optional(),
  ...spamFields,
}).refine(
  (d) => !d.preferredStartDate || !d.preferredEndDate || d.preferredEndDate >= d.preferredStartDate,
  { message: 'End date must be after the start date', path: ['preferredEndDate'] },
);

export const saveDraftSchema = z.object({
  token: z.string().max(200).optional(),
  email,
  step: z.number().int().min(0).max(10).default(0),
  data: z.record(z.any()).refine((d) => JSON.stringify(d).length < 20000, 'Draft is too large'),
  sendResumeLink: z.boolean().optional().default(false),
});

export const resumeDraftSchema = z.object({
  token: z.string().min(20).max(200),
  email,
});

export const funnelSchema = z.object({
  event: z.enum(['start', 'step', 'submit']),
  step: z.number().int().min(0).max(10).default(0),
  service: z.string().trim().max(90).optional().default('any'),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email,
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().max(160).optional().default(''),
  message: z.string().trim().min(10, 'Your message is a little short').max(5000),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the privacy notice to continue' }) }),
  marketingConsent: z.boolean().optional().default(false),
  ...spamFields,
});

export const partnershipSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email,
  phone: z.string().trim().max(30).optional().default(''),
  organization: z.string().trim().max(160).optional().default(''),
  companyWebsite: z.string().trim().max(300).optional().default(''),
  partnershipType: z.string().trim().min(1, 'Choose a partnership type').max(40),
  message: z.string().trim().min(20, 'Tell us a little more about your proposal (at least 20 characters)').max(5000),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the privacy notice to continue' }) }),
  marketingConsent: z.boolean().optional().default(false),
  ...spamFields,
});

/* Staff */

export const listEnquiriesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  assignedTo: z.union([objectId, z.literal('me'), z.literal('unassigned')]).optional(),
  serviceId: objectId.optional(),
  kind: z.enum(['project', 'partnership']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateEnquirySchema = z
  .object({
    status: z.enum(ENQUIRY_STATUSES),
    followUpAt: z.coerce.date().nullable(),
  })
  .partial()
  .strict();

export const assignSchema = z.object({ userId: objectId.nullable() });
export const noteSchema = z.object({ text: z.string().trim().min(1).max(4000) });
