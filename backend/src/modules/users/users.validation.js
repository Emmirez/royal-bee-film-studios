import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const photo = z
  .object({ url: z.string().url().max(1000), publicId: z.string().max(300).optional(), alt: z.string().max(250).optional() })
  .optional();

const base = {
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  phone: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  jobTitle: z.string().trim().max(100).optional().default(''),
  department: z.string().trim().max(100).optional().default(''),
  employmentStatus: z.enum(['full_time', 'part_time', 'contractor', 'freelance', 'intern', 'other']).optional(),
  photo,
  roleId: objectId,
};

export const inviteStaffSchema = z.object({
  ...base,
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
});

export const updateStaffSchema = z
  .object({
    firstName: base.firstName.optional(),
    lastName: base.lastName.optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(300).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    department: z.string().trim().max(100).optional(),
    employmentStatus: base.employmentStatus,
    photo,
    roleId: objectId.optional(),
  })
  .strict();

export const listStaffQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['invited', 'active', 'deactivated']).optional(),
  roleId: objectId.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
