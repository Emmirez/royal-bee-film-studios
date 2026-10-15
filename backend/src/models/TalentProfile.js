import mongoose from 'mongoose';
import { imageSchema } from './shared.js';
import { AVAILABILITY, TALENT_STATUSES, TALENT_TYPE_KEYS } from '../constants/talent.js';
import { CURRENCIES } from '../constants/billing.js';

const { ObjectId } = mongoose.Schema.Types;

/**
 * A person on the talent roster. Created when someone applies on the website
 * (status "pending"); a portal account (User) is linked once staff approve.
 * Private — never shown on the public website.
 */
const talentProfileSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    status: { type: String, enum: TALENT_STATUSES, default: 'pending', index: true },
    user: { type: ObjectId, ref: 'User', default: null, index: true },

    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, index: true },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    stageName: { type: String, trim: true, maxlength: 100, default: '' },

    talentTypes: { type: [{ type: String, enum: TALENT_TYPE_KEYS }], default: [] },
    bio: { type: String, trim: true, maxlength: 1500, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    country: { type: String, trim: true, maxlength: 80, default: '' },
    languages: { type: [String], default: [] },
    skills: { type: [String], default: [] },

    // Casting details
    gender: { type: String, trim: true, maxlength: 40, default: '' },
    playingAgeMin: { type: Number, min: 18, max: 100, default: null },
    playingAgeMax: { type: Number, min: 18, max: 100, default: null },
    heightCm: { type: Number, min: 50, max: 250, default: null },
    build: { type: String, trim: true, maxlength: 40, default: '' },
    hairColour: { type: String, trim: true, maxlength: 40, default: '' },
    eyeColour: { type: String, trim: true, maxlength: 40, default: '' },

    photos: { type: [imageSchema], default: [] },
    showreels: {
      type: [new mongoose.Schema({ title: { type: String, trim: true, maxlength: 120, default: '' }, url: { type: String, trim: true, maxlength: 500 } }, { _id: false })],
      default: [],
    },

    // Staff-only information (never shown publicly)
    dayRate: {
      amount: { type: Number, min: 0, default: null },
      currency: { type: String, enum: CURRENCIES, default: 'NGN' },
    },
    rateNotes: { type: String, trim: true, maxlength: 300, default: '' },
    availability: {
      status: { type: String, enum: AVAILABILITY, default: 'available' },
      note: { type: String, trim: true, maxlength: 300, default: '' },
    },
    internalNotes: { type: String, trim: true, maxlength: 3000, default: '' },

    application: {
      message: { type: String, trim: true, maxlength: 2000, default: '' },
      submittedAt: { type: Date, default: null },
      ageConfirmed: { type: Boolean, default: false },
      ipHash: { type: String, default: '' },
    },
    reviewedBy: { type: ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true },
);

talentProfileSchema.index({ status: 1, talentTypes: 1 });

export const TalentProfile = mongoose.model('TalentProfile', talentProfileSchema);