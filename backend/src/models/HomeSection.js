import mongoose from 'mongoose';
import { HOME_SECTION_TYPES } from '../constants/content.js';
import { withWorkflow } from './shared.js';

/**
 * A configurable homepage section. `content` is type-specific, e.g.:
 *  - intro:                { eyebrow, heading, body, image, stats: [{ value, label }] }
 *  - featured_productions: { eyebrow, heading, productionIds: [], limit }
 *  - services:             { eyebrow, heading, intro, serviceIds: [] (empty = all published), limit }
 *  - founder:              { } (pulls from the published founder profile)
 *  - news:                 { eyebrow, heading, limit }
 *  - ticker:               { eyebrow, heading } (items + speed from ticker settings)
 *  - testimonials:         { eyebrow, heading, items: [{ quote, author, role, approved }] }
 *  - cta:                  { heading, body, ctas: [{ label, href, variant }], backgroundImage }
 *  - contact:              { heading, body }
 */
const homeSectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: HOME_SECTION_TYPES, required: true },
    name: { type: String, trim: true, maxlength: 80, required: true }, // admin label
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0, index: true },
    layout: { type: String, trim: true, maxlength: 40, default: 'default' },
    theme: { type: String, enum: ['light', 'warm', 'dark'], default: 'light' },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

withWorkflow(homeSectionSchema);

export const HomeSection = mongoose.model('HomeSection', homeSectionSchema);
