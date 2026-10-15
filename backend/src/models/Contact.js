import mongoose from 'mongoose';

/**
 * CRM contact (individual or organization). One record per email address —
 * enquiries and contact messages upsert into it instead of duplicating.
 */
const noteSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, maxlength: 4000, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // enquiry_submitted, contact_message, note, status_changed, ...
    summary: { type: String, maxlength: 300, default: '' },
    refType: String,
    refId: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['individual', 'organization'], default: 'individual' },
    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, maxlength: 160, default: '' },
    stage: { type: String, enum: ['lead', 'prospect', 'client', 'inactive'], default: 'lead', index: true },
    source: { type: String, trim: true, default: 'website' },
    firstSource: { type: String, trim: true, default: 'website' },
    utm: {
      source: String,
      medium: String,
      campaign: String,
    },
    servicesOfInterest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    followUpAt: { type: Date, default: null, index: true },
    preferredContactMethod: { type: String, enum: ['email', 'phone', 'any'], default: 'email' },
    consent: {
      marketing: { type: Boolean, default: false },
      marketingAt: { type: Date },
      privacyAcceptedAt: { type: Date },
    },
    tags: { type: [String], default: [] },
    notes: { type: [noteSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    enquiryCount: { type: Number, default: 0 },
    lastContactAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

contactSchema.index({ name: 'text', email: 'text', organization: 'text' });
contactSchema.index({ updatedAt: -1 });

export const Contact = mongoose.model('Contact', contactSchema);
