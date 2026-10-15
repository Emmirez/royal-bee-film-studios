import mongoose from 'mongoose';
import { imageSchema, ctaLinkSchema, seoSchema } from './shared.js';
import { makeSingletonModel } from './singleton.js';

const experienceSchema = new mongoose.Schema(
  {
    role: { type: String, trim: true, maxlength: 120, default: '' },
    organization: { type: String, trim: true, maxlength: 120, default: '' },
    period: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 800, default: '' },
  },
  { _id: true },
);

/** Only achievements marked `verified` are ever shown publicly. */
const achievementSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 160, default: '' },
    year: { type: String, trim: true, maxlength: 10, default: '' },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    verified: { type: Boolean, default: false },
    evidenceUrl: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: true },
);

const mediaAppearanceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 200, default: '' },
    outlet: { type: String, trim: true, maxlength: 120, default: '' },
    type: { type: String, enum: ['interview', 'article', 'podcast', 'tv', 'panel', 'publication', 'other'], default: 'interview' },
    date: { type: Date },
    url: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: true },
);

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 60, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' },
    platform: { type: String, trim: true, maxlength: 30, default: 'website' },
  },
  { _id: true },
);

const founderContent = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: '' },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    portrait: { type: imageSchema, default: () => ({}) },
    coverImage: { type: imageSchema, default: () => ({}) },
    // Homepage spotlight
    spotlightEyebrow: { type: String, trim: true, maxlength: 60, default: 'The Founder' },
    spotlightHeading: { type: String, trim: true, maxlength: 160, default: '' },
    shortBio: { type: String, trim: true, maxlength: 700, default: '' },
    quote: { type: String, trim: true, maxlength: 400, default: '' },
    // Founder page
    biography: { type: [String], default: [] }, // paragraphs
    vision: { type: String, trim: true, maxlength: 2000, default: '' },
    philosophy: { type: String, trim: true, maxlength: 2000, default: '' },
    experience: { type: [experienceSchema], default: [] },
    achievements: { type: [achievementSchema], default: [] },
    mediaAppearances: { type: [mediaAppearanceSchema], default: [] },
    links: { type: [linkSchema], default: [] },
    relatedProductions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Production' }],
    cta: { type: ctaLinkSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },
    isPlaceholder: { type: Boolean, default: false },
  },
  { _id: false },
);

export const Founder = makeSingletonModel('Founder', founderContent);
