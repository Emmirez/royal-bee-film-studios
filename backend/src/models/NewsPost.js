import mongoose from 'mongoose';
import { imageSchema, seoSchema, withWorkflow } from './shared.js';

/** Public news & announcements. Internal staff announcements are a separate module (Stage 8). */
const newsPostSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true, maxlength: 180 },
    slug: { type: String, trim: true, unique: true, index: true },
    excerpt: { type: String, trim: true, maxlength: 400, default: '' },
    /** Body as an ordered list of paragraphs/blocks (plain text, rendered safely by the frontend). */
    body: {
      type: [
        new mongoose.Schema(
          {
            type: { type: String, enum: ['paragraph', 'heading', 'quote', 'image'], default: 'paragraph' },
            text: { type: String, trim: true, maxlength: 6000, default: '' },
            image: { type: imageSchema, default: undefined },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    coverImage: { type: imageSchema, default: () => ({}) },
    category: { type: String, trim: true, maxlength: 60, default: 'Studio News', index: true },
    tags: { type: [String], default: [] },
    authorName: { type: String, trim: true, maxlength: 80, default: 'Royal Bee Studios' },
    isFeatured: { type: Boolean, default: false },
    isPlaceholder: { type: Boolean, default: false },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

withWorkflow(newsPostSchema);
newsPostSchema.index({ title: 'text', excerpt: 'text', tags: 'text' }, { weights: { title: 10, excerpt: 4 } });
newsPostSchema.index({ publishAt: -1, publishedAt: -1 });

export const NewsPost = mongoose.model('NewsPost', newsPostSchema);
