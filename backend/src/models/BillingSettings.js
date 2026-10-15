import mongoose from 'mongoose';
import { CURRENCIES } from '../constants/billing.js';

const bankSchema = new mongoose.Schema(
  {
    currency: { type: String, enum: CURRENCIES, default: 'NGN' },
    bankName: { type: String, trim: true, maxlength: 120, default: '' },
    accountName: { type: String, trim: true, maxlength: 160, default: '' },
    accountNumber: { type: String, trim: true, maxlength: 60, default: '' },
    /** Sort code, SWIFT/IBAN, routing number… */
    extra: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

/** Business and payment details printed on invoices, quotes and receipts. */
const billingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    businessName: { type: String, trim: true, maxlength: 160, default: 'Royal Bee Film Studios' },
    address: { type: String, trim: true, maxlength: 500, default: '' },
    email: { type: String, trim: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    taxId: { type: String, trim: true, maxlength: 60, default: '' },
    defaultCurrency: { type: String, enum: CURRENCIES, default: 'NGN' },
    vatEnabledByDefault: { type: Boolean, default: true },
    defaultVatRate: { type: Number, min: 0, max: 100, default: 7.5 },
    paymentTermsDays: { type: Number, min: 0, max: 365, default: 14 },
    quoteValidDays: { type: Number, min: 1, max: 365, default: 30 },
    bankAccounts: { type: [bankSchema], default: [] },
    defaultNotes: { type: String, trim: true, maxlength: 2000, default: 'Thank you for choosing Royal Bee Film Studios.' },
    defaultTerms: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: 'Please include the invoice number as your payment reference. Payment is due by the date shown.',
    },
  },
  { timestamps: true },
);

billingSettingsSchema.statics.getMain = async function getMain() {
  return (await this.findOne({ key: 'main' })) || this.create({ key: 'main' });
};

export const BillingSettings = mongoose.model('BillingSettings', billingSettingsSchema);