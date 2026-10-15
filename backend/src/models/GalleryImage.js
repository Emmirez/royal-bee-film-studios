import mongoose from 'mongoose';
import { GALLERY_CATEGORIES } from '../constants/content.js';
import { imageSchema, withSimplePublish } from './shared.js';

/** Studio and production galleries (separate from the founder gallery). */
const galleryImageSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, required: true },
    caption: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, enum: GALLERY_CATEGORIES, default: 'studio' },
    production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', default: null },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

withSimplePublish(galleryImageSchema);

export const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);
