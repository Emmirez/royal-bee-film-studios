import mongoose from 'mongoose';

/**
 * Saved-and-resumable enquiry draft. Access needs BOTH the random token
 * (hash stored) and the matching email address. Auto-deleted after expiry.
 */
const enquiryDraftSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true, trim: true, required: true },
    step: { type: Number, min: 0, max: 10, default: 0 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    failedAttempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

enquiryDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EnquiryDraft = mongoose.model('EnquiryDraft', enquiryDraftSchema);

/** Aggregate funnel counters (no personal data): how many reach each step per day. */
const funnelStatSchema = new mongoose.Schema({
  date: { type: String, required: true },
  service: { type: String, default: 'any' },
  event: { type: String, enum: ['start', 'step', 'submit'], required: true },
  step: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
});
funnelStatSchema.index({ date: 1, service: 1, event: 1, step: 1 }, { unique: true });

export const FunnelStat = mongoose.model('FunnelStat', funnelStatSchema);
