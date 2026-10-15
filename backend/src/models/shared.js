import mongoose from 'mongoose';
import { CONTENT_STATUSES } from '../constants/content.js';

/**
 * Reusable image reference. `url` may be an Unsplash placeholder, a local
 * frontend path (/images/...), or a Cloudinary secure URL. `publicId` is set
 * only for Cloudinary assets so they can be transformed and tracked.
 */
export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, maxlength: 250, default: '' },
    width: Number,
    height: Number,
    isPlaceholder: { type: Boolean, default: false },
  },
  { _id: false },
);

export const videoSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['none', 'local', 'cloudinary', 'youtube', 'vimeo', 'url'], default: 'none' },
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    mobileUrl: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

export const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    ogImage: { type: imageSchema, default: undefined },
    noIndex: { type: Boolean, default: false },
    canonicalUrl: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

export const ctaLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 60, default: '' },
    href: { type: String, trim: true, maxlength: 500, default: '' },
    variant: { type: String, enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
  },
  { _id: false },
);

const reviewEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String, maxlength: 1000, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/** Adds the full content workflow fields to a schema. */
export function withWorkflow(schema) {
  schema.add({
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft', index: true },
    publishAt: { type: Date, default: null },
    expireAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    reviewHistory: { type: [reviewEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  });
  return schema;
}

/** Adds the simple publish toggle used by image collections. */
export function withSimplePublish(schema) {
  schema.add({
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  });
  return schema;
}
