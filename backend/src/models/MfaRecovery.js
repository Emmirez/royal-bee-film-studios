import mongoose from 'mongoose';

/**
 * "Lost my authenticator AND recovery codes" — email recovery with a waiting period.
 *  pending_confirm → (email link clicked) → waiting (24h) → completed on next password sign-in
 *  Any time before completion it can be cancelled from the email link or by a successful 2FA sign-in.
 */
const mfaRecoverySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending_confirm', 'waiting', 'cancelled', 'completed'], default: 'pending_confirm', index: true },
    confirmTokenHash: { type: String, index: true },
    confirmExpiresAt: { type: Date },
    cancelTokenHash: { type: String, index: true },
    releaseAt: { type: Date, default: null },
    confirmedAt: Date,
    cancelledAt: Date,
    cancelReason: { type: String, default: '' },
    completedAt: Date,
    requestIpHash: { type: String, default: '' },
  },
  { timestamps: true },
);

// Old finished requests clean themselves up after 90 days
mfaRecoverySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const MfaRecovery = mongoose.model('MfaRecovery', mfaRecoverySchema);