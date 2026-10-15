import { z } from 'zod';
import { CURRENCIES, DISCOUNT_TYPES, DOCUMENT_KINDS, PAYMENT_METHODS } from '../../constants/billing.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
/** Empty string or null clears the date. */
const optionalDate = z.preprocess((v) => (v === '' || v === null ? null : v), z.coerce.date().nullable().optional());
const requiredDate = z.coerce.date({ errorMap: () => ({ message: 'Choose a date' }) });

const item = z.object({
  description: z.string().trim().min(1, 'Describe this line').max(500),
  quantity: z.coerce.number().positive('Quantity must be more than 0').max(1_000_000),
  unitPrice: z.coerce.number().min(0, 'Price can’t be negative').max(1_000_000_000_000),
});

const docFields = {
  clientId: objectId,
  projectId: objectId.nullable().optional(),
  title: z.string().trim().max(160).optional().default(''),
  currency: z.enum(CURRENCIES).optional().default('NGN'),
  issueDate: requiredDate,
  dueDate: optionalDate,
  items: z.array(item).min(1, 'Add at least one line').max(100),
  discountType: z.enum(DISCOUNT_TYPES).optional().default('none'),
  discountValue: z.coerce.number().min(0).max(1_000_000_000_000).optional().default(0),
  vatEnabled: z.boolean().optional().default(false),
  vatRate: z.coerce.number().min(0).max(100).optional().default(0),
  notes: z.string().trim().max(2000).optional().default(''),
  terms: z.string().trim().max(3000).optional().default(''),
};

const percentCheck = (d) => d.discountType !== 'percent' || (d.discountValue ?? 0) <= 100;
const percentIssue = { message: 'A percentage discount can’t be more than 100', path: ['discountValue'] };

export const createSchema = z.object({ kind: z.enum(DOCUMENT_KINDS), ...docFields }).refine(percentCheck, percentIssue);

export const updateSchema = z
  .object({
    clientId: docFields.clientId,
    projectId: docFields.projectId,
    title: z.string().trim().max(160),
    currency: z.enum(CURRENCIES),
    issueDate: requiredDate,
    dueDate: optionalDate,
    items: docFields.items,
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: z.coerce.number().min(0).max(1_000_000_000_000),
    vatEnabled: z.boolean(),
    vatRate: z.coerce.number().min(0).max(100),
    notes: z.string().trim().max(2000),
    terms: z.string().trim().max(3000),
  })
  .partial()
  .refine(percentCheck, percentIssue);

export const listQuery = z.object({
  kind: z.enum(DOCUMENT_KINDS).optional(),
  status: z.enum(['draft', 'sent', 'part_paid', 'paid', 'void', 'overdue', 'unpaid', 'accepted', 'declined', 'converted', 'expired']).optional(),
  clientId: objectId.optional(),
  projectId: objectId.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive('Enter the amount received'),
  date: requiredDate,
  method: z.enum(PAYMENT_METHODS).optional().default('bank_transfer'),
  reference: z.string().trim().max(120).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
  sendReceipt: z.boolean().optional().default(true),
});

export const voidSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(300) });

export const sendSchema = z.object({ email: z.boolean().optional().default(true) });

export const decisionSchema = z
  .object({ decision: z.enum(['accepted', 'declined']), comment: z.string().trim().max(2000).optional().default('') })
  .refine((d) => d.decision === 'accepted' || d.comment.length >= 3, { message: 'Let the studio know why (a few words is fine)', path: ['comment'] });

const bank = z.object({
  currency: z.enum(CURRENCIES),
  bankName: z.string().trim().max(120).default(''),
  accountName: z.string().trim().max(160).default(''),
  accountNumber: z.string().trim().max(60).default(''),
  extra: z.string().trim().max(300).default(''),
});

export const settingsSchema = z
  .object({
    businessName: z.string().trim().min(2, 'Enter the business name').max(160),
    address: z.string().trim().max(500),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email').max(254)]),
    phone: z.string().trim().max(40),
    taxId: z.string().trim().max(60),
    defaultCurrency: z.enum(CURRENCIES),
    vatEnabledByDefault: z.boolean(),
    defaultVatRate: z.coerce.number().min(0).max(100),
    paymentTermsDays: z.coerce.number().int().min(0).max(365),
    quoteValidDays: z.coerce.number().int().min(1).max(365),
    bankAccounts: z.array(bank).max(10),
    defaultNotes: z.string().trim().max(2000),
    defaultTerms: z.string().trim().max(3000),
  })
  .partial();