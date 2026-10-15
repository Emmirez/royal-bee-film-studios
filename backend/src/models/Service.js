import mongoose from 'mongoose';
import { imageSchema, seoSchema, ctaLinkSchema, withWorkflow } from './shared.js';

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    price: { type: Number, min: 0, default: null },
    currency: { type: String, default: 'NGN' },
    priceLabel: { type: String, trim: true, maxlength: 60, default: '' }, // e.g. "From", "per day"
    priceVisible: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
  },
  { _id: true },
);

const addOnSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    price: { type: Number, min: 0, default: null },
    priceVisible: { type: Boolean, default: false },
  },
  { _id: true },
);

/** Service-specific enquiry questions → conditional fields in the public enquiry form. */
const enquiryQuestionSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, match: /^[a-z0-9_]+$/, required: true },
    label: { type: String, trim: true, maxlength: 160, required: true },
    type: { type: String, enum: ['text', 'textarea', 'number', 'select', 'multiselect', 'date', 'boolean'], default: 'text' },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    helpText: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
);

/** Testimonials appear publicly only when `approved` (consent recorded). */
const testimonialSchema = new mongoose.Schema(
  {
    quote: { type: String, trim: true, maxlength: 600, default: '' },
    author: { type: String, trim: true, maxlength: 80, default: '' },
    role: { type: String, trim: true, maxlength: 120, default: '' },
    approved: { type: Boolean, default: false },
  },
  { _id: true },
);

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true, maxlength: 120 },
    slug: { type: String, trim: true, unique: true, index: true },
    summary: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, trim: true, maxlength: 6000, default: '' },
    icon: { type: String, trim: true, maxlength: 40, default: 'Clapperboard' }, // Lucide icon name
    coverImage: { type: imageSchema, default: () => ({}) },
    benefits: { type: [String], default: [] },
    process: {
      type: [
        new mongoose.Schema(
          { title: { type: String, trim: true, maxlength: 80 }, description: { type: String, trim: true, maxlength: 500 } },
          { _id: false },
        ),
      ],
      default: [],
    },
    deliverables: { type: [String], default: [] },
    startingPrice: {
      amount: { type: Number, min: 0, default: null },
      currency: { type: String, default: 'NGN' },
      visible: { type: Boolean, default: false },
      note: { type: String, trim: true, maxlength: 140, default: 'Indicative only — final pricing is confirmed in a formal quotation.' },
    },
    packages: { type: [packageSchema], default: [] },
    addOns: { type: [addOnSchema], default: [] },
    faqs: {
      type: [
        new mongoose.Schema(
          { question: { type: String, trim: true, maxlength: 200 }, answer: { type: String, trim: true, maxlength: 1500 } },
          { _id: true },
        ),
      ],
      default: [],
    },
    testimonials: { type: [testimonialSchema], default: [] },
    portfolio: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Production' }],
    enquiryQuestions: { type: [enquiryQuestionSchema], default: [] },
    cta: { type: ctaLinkSchema, default: () => ({ label: 'Start a project', href: '/enquire' }) },
    seo: { type: seoSchema, default: () => ({}) },
    order: { type: Number, default: 0, index: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

withWorkflow(serviceSchema);
serviceSchema.index({ title: 'text', summary: 'text', description: 'text' }, { weights: { title: 10, summary: 4 } });

export const Service = mongoose.model('Service', serviceSchema);
