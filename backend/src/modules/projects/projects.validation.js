import { z } from 'zod';
import { PROJECT_STAGE_KEYS, PROJECT_STATUSES } from '../../constants/projects.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
/** Empty string or null clears the date (z.coerce.date would turn null into 1 Jan 1970). */
const optionalDate = z.preprocess((v) => (v === '' || v === null ? null : v), z.coerce.date().nullable().optional());
/** Full URL only — deliverable links open outside the site. */
const link = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Use a full link starting with https://')
  .optional()
  .default('');
const image = z
  .object({ url: z.string().trim().max(1000), publicId: z.string().trim().max(300).optional().default(''), alt: z.string().trim().max(250).optional().default('') })
  .nullable()
  .optional();

export const listProjectsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  stage: z.enum(PROJECT_STAGE_KEYS).optional(),
  clientId: objectId.optional(),
  awaiting: z.enum(['reply', 'changes']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const projectFields = {
  title: z.string().trim().min(2, 'Give the project a title').max(160),
  clientId: objectId,
  summary: z.string().trim().max(3000).optional().default(''),
  serviceTitle: z.string().trim().max(120).optional().default(''),
  stage: z.enum(PROJECT_STAGE_KEYS).optional().default('briefing'),
  status: z.enum(PROJECT_STATUSES).optional().default('active'),
  startDate: optionalDate,
  dueDate: optionalDate,
  managerId: objectId.nullable().optional(),
  visibleToClient: z.boolean().optional().default(true),
};

export const createProjectSchema = z.object(projectFields);

export const updateProjectSchema = z
  .object({
    title: projectFields.title,
    clientId: projectFields.clientId,
    summary: z.string().trim().max(3000),
    serviceTitle: z.string().trim().max(120),
    stage: z.enum(PROJECT_STAGE_KEYS),
    status: z.enum(PROJECT_STATUSES),
    startDate: optionalDate,
    dueDate: optionalDate,
    managerId: objectId.nullable(),
    visibleToClient: z.boolean(),
  })
  .partial();

export const staffMessageSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(5000),
  internal: z.boolean().optional().default(false),
});

export const clientMessageSchema = z.object({ body: z.string().trim().min(1, 'Write a message').max(5000) });

export const deliverableSchema = z.object({
  title: z.string().trim().min(2, 'Give it a title').max(160),
  description: z.string().trim().max(2000).optional().default(''),
  link,
  previewImage: image,
  dueDate: optionalDate,
});

export const updateDeliverableSchema = deliverableSchema.partial().extend({
  /** Upload a new version: bumps the version number and asks the client to review again. */
  newVersion: z.boolean().optional().default(false),
});

export const decisionSchema = z
  .object({
    decision: z.enum(['approved', 'changes_requested']),
    comment: z.string().trim().max(3000).optional().default(''),
  })
  .refine((d) => d.decision === 'approved' || d.comment.length >= 5, { message: 'Tell the studio what you’d like changed', path: ['comment'] });