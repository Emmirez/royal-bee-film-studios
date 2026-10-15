import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: [String], required: true },
    template: { type: String, required: true, index: true },
    subject: { type: String, default: '' },
    category: { type: String, enum: ['transactional', 'marketing'], default: 'transactional' },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'skipped_not_configured'],
      default: 'queued',
      index: true,
    },
    provider: { type: String, default: 'brevo' },
    providerMessageId: { type: String, default: '' },
    error: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
    /** Prevents duplicate sends when a job or request is retried. */
    idempotencyKey: { type: String, unique: true, sparse: true },
    relatedType: { type: String, default: '' },
    relatedId: { type: String, default: '' },
  },
  { timestamps: true },
);

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
