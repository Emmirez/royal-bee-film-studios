import mongoose from 'mongoose';
import { imageSchema, withSimplePublish } from './shared.js';

/** One image in the continuous homepage ticker. Order + visibility managed in the CMS. */
const tickerItemSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, required: true },
    caption: { type: String, trim: true, maxlength: 140, default: '' },
    category: {
      type: String,
      enum: ['production', 'behind_the_scenes', 'film_set', 'studio'],
      default: 'production',
    },
    link: {
      type: { type: String, enum: ['none', 'production', 'gallery', 'url'], default: 'none' },
      production: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },
      galleryImage: { type: mongoose.Schema.Types.ObjectId, ref: 'GalleryImage' },
      url: { type: String, trim: true, maxlength: 500, default: '' },
    },
  },
  { timestamps: true },
);

withSimplePublish(tickerItemSchema);

export const TickerItem = mongoose.model('TickerItem', tickerItemSchema);
