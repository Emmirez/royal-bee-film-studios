import mongoose from 'mongoose';
import { CTA_PLACEMENTS } from '../constants/content.js';
import { withSimplePublish } from './shared.js';

/** Configurable call to action. Conversion tracking is aggregate-only (CtaStat), no personal data. */
const ctaSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 80 }, // admin label
    label: { type: String, trim: true, required: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    href: { type: String, trim: true, required: true, maxlength: 500 },
    placement: { type: String, enum: CTA_PLACEMENTS, required: true, index: true },
    variant: { type: String, enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
    context: {
      service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
      production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', default: null },
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

withSimplePublish(ctaSchema);

export const CallToAction = mongoose.model('CallToAction', ctaSchema);

const ctaStatSchema = new mongoose.Schema({
  cta: { type: mongoose.Schema.Types.ObjectId, ref: 'CallToAction', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  clicks: { type: Number, default: 0 },
});
ctaStatSchema.index({ cta: 1, date: 1 }, { unique: true });

export const CtaStat = mongoose.model('CtaStat', ctaStatSchema);
