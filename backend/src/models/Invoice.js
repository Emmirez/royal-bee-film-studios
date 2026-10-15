import mongoose from 'mongoose';
import { CURRENCIES, DISCOUNT_TYPES, DOCUMENT_KINDS, PAYMENT_METHODS } from '../constants/billing.js';

const { ObjectId } = mongoose.Schema.Types;

const lineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true },
  method: { type: String, enum: PAYMENT_METHODS, default: 'bank_transfer' },
  reference: { type: String, trim: true, maxlength: 120, default: '' },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  recordedBy: { type: ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
});

/**
 * An invoice or a quote (kind). Records only — payments are made off the
 * website and recorded here by staff.
 */
const invoiceSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true, index: true },
    reference: { type: String, unique: true, required: true },
    status: { type: String, required: true, default: 'draft', index: true },
    client: { type: ObjectId, ref: 'User', required: true, index: true },
    project: { type: ObjectId, ref: 'Project', default: null, index: true },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    currency: { type: String, enum: CURRENCIES, default: 'NGN' },
    issueDate: { type: Date, required: true },
    /** Invoices: payment due date. Quotes: valid until. */
    dueDate: { type: Date, default: null, index: true },
    items: { type: [lineSchema], default: [] },
    discountType: { type: String, enum: DISCOUNT_TYPES, default: 'none' },
    discountValue: { type: Number, min: 0, default: 0 },
    vatEnabled: { type: Boolean, default: false },
    vatRate: { type: Number, min: 0, max: 100, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    terms: { type: String, trim: true, maxlength: 3000, default: '' },
    payments: { type: [paymentSchema], default: [] },
    sentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, trim: true, maxlength: 300, default: '' },
    /** Quotes: the client's (or staff's) answer. */
    decision: {
      at: { type: Date, default: null },
      by: { type: ObjectId, ref: 'User', default: null },
      comment: { type: String, trim: true, maxlength: 2000, default: '' },
    },
    convertedTo: { type: ObjectId, ref: 'Invoice', default: null },
    convertedFrom: { type: ObjectId, ref: 'Invoice', default: null },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invoiceSchema.index({ kind: 1, status: 1, dueDate: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);