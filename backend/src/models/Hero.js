import mongoose from 'mongoose';
import { imageSchema, videoSchema, ctaLinkSchema } from './shared.js';
import { makeSingletonModel } from './singleton.js';

/**
 * Homepage hero. Default video lives in the frontend at /images/hero-video.mp4
 * (type "local"). Admins can switch to a Cloudinary upload or a YouTube/Vimeo embed.
 */
const heroContent = new mongoose.Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 80, default: '' },
    headline: { type: String, trim: true, maxlength: 140, default: '' },
    subheadline: { type: String, trim: true, maxlength: 320, default: '' },
    video: { type: videoSchema, default: () => ({ type: 'local', url: '/images/hero-video.mp4' }) },
    posterImage: { type: imageSchema, default: () => ({}) },
    /** What phones load: a lighter mobile video, the full video, or the poster only. */
    mobileBehavior: { type: String, enum: ['poster', 'mobile_video', 'full_video'], default: 'full_video' },
    overlayOpacity: { type: Number, min: 0, max: 90, default: 45 },
    textAlign: { type: String, enum: ['left', 'center'], default: 'left' },
    ctas: { type: [ctaLinkSchema], default: [] },
    showScrollCue: { type: Boolean, default: true },
  },
  { _id: false },
);

export const Hero = makeSingletonModel('Hero', heroContent);
