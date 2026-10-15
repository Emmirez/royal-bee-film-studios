import mongoose from 'mongoose';
import { imageSchema, seoSchema } from './shared.js';

/** Studio-wide configuration. Edited by users with settings.manage (no publish workflow). */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    studioName: { type: String, trim: true, default: 'Royal Bee Film Studios' },
    tagline: { type: String, trim: true, maxlength: 160, default: '' },
    logo: { type: imageSchema, default: () => ({ url: '/logo.png', alt: 'Royal Bee Film Studios' }) },
    contact: {
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      whatsappDisplay: { type: String, trim: true, default: '' }, // display only — no WhatsApp notifications
      address: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
      mapUrl: { type: String, trim: true, default: '' },
      officeHours: { type: String, trim: true, default: '' },
    },
    social: {
      instagram: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      x: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      tiktok: { type: String, trim: true, default: '' },
      vimeo: { type: String, trim: true, default: '' },
    },
    seo: { type: seoSchema, default: () => ({}) },
    footer: {
      blurb: { type: String, trim: true, maxlength: 400, default: '' },
      copyright: { type: String, trim: true, maxlength: 160, default: '' },
    },
    ticker: {
      enabled: { type: Boolean, default: true },
      speedSeconds: { type: Number, min: 10, max: 300, default: 60 }, // time for one full loop
      direction: { type: String, enum: ['left', 'right'], default: 'left' },
      pauseOnHover: { type: Boolean, default: true },
      imageHeight: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    },
    search: {
      services: { type: Boolean, default: true },
      productions: { type: Boolean, default: true },
      news: { type: Boolean, default: true },
      founder: { type: Boolean, default: true },
    },
    workflow: {
      /** When true, content must be approved before it can be published. */
      contentApprovalRequired: { type: Boolean, default: true },
    },
    notifications: {
      enquiryEmails: { type: [String], default: [] },
      contactEmails: { type: [String], default: [] },
    },
    enquiry: {
      budgetRanges: {
        type: [String],
        default: ['Under ₦1,000,000', '₦1m – ₦5m', '₦5m – ₦20m', '₦20m – ₦50m', 'Above ₦50m', 'Not sure yet'],
      },
      currency: { type: String, default: 'NGN' },
      privacyNotice: { type: String, trim: true, maxlength: 1000, default: '' },
      draftExpiryDays: { type: Number, min: 1, max: 60, default: 14 },
    },
    analytics: {
      // Measurement IDs only — loaded by the frontend after cookie consent.
      googleAnalyticsId: { type: String, trim: true, default: '' },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

siteSettingsSchema.statics.getMain = async function getMain() {
  return (await this.findOne({ key: 'main' })) || this.create({ key: 'main' });
};

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
