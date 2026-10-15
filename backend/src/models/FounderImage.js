import mongoose from 'mongoose';
import { FOUNDER_IMAGE_CATEGORIES } from '../constants/content.js';
import { imageSchema, withSimplePublish } from './shared.js';

const founderImageSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, required: true },
    caption: { type: String, trim: true, maxlength: 240, default: '' },
    category: { type: String, enum: FOUNDER_IMAGE_CATEGORIES, default: 'portrait' },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

withSimplePublish(founderImageSchema);

export const FounderImage = mongoose.model('FounderImage', founderImageSchema);
