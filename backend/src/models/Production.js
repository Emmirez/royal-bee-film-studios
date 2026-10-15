import mongoose from 'mongoose';
import { PRODUCTION_CATEGORIES } from '../constants/content.js';
import { imageSchema, videoSchema, seoSchema, withWorkflow } from './shared.js';

const mediaItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['image', 'video'], default: 'image' },
    image: { type: imageSchema, default: undefined },
    video: { type: videoSchema, default: undefined },
    caption: { type: String, trim: true, maxlength: 240, default: '' },
  },
  { _id: true },
);

/**
 * Portfolio production. `visibility`:
 *   public   – listed and searchable once published
 *   unlisted – reachable by direct link only, never listed or searchable
 *   private  – never exposed publicly, even when "published"
 * `isPlaceholder` marks seed/sample content so the frontend can label it.
 */
const productionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true, maxlength: 160 },
    slug: { type: String, trim: true, unique: true, index: true },
    logline: { type: String, trim: true, maxlength: 300, default: '' },
    synopsis: { type: String, trim: true, maxlength: 6000, default: '' },
    category: { type: String, enum: PRODUCTION_CATEGORIES, default: 'Feature Film', index: true },
    tags: { type: [String], default: [] },
    year: { type: Number, min: 1900, max: 2200 },
    releaseDate: { type: Date },
    runtimeMinutes: { type: Number, min: 0 },
    clientName: { type: String, trim: true, maxlength: 120, default: '' },
    showClientName: { type: Boolean, default: false }, // only with client permission
    credits: {
      type: [new mongoose.Schema({ role: String, name: String }, { _id: false })],
      default: [],
    },
    coverImage: { type: imageSchema, default: () => ({}) },
    trailer: { type: videoSchema, default: () => ({ type: 'none' }) },
    gallery: { type: [mediaItemSchema], default: [] },
    behindTheScenes: { type: [mediaItemSchema], default: [] },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    relatedProductions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Production' }],
    isFeatured: { type: Boolean, default: false, index: true },
    visibility: { type: String, enum: ['public', 'unlisted', 'private'], default: 'public' },
    isPlaceholder: { type: Boolean, default: false },
    seo: { type: seoSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

withWorkflow(productionSchema);
productionSchema.index(
  { title: 'text', logline: 'text', synopsis: 'text', tags: 'text' },
  { weights: { title: 10, logline: 5, tags: 4 } },
);

export const Production = mongoose.model('Production', productionSchema);
