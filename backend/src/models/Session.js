import mongoose from 'mongoose';

/**
 * A refresh-token session. Only the SHA-256 hash of the refresh token is stored.
 * Tokens rotate on every refresh; re-use of a rotated token revokes the whole family.
 */
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    replacedBy: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
    mfaVerified: { type: Boolean, default: false },
    userAgent: { type: String, default: '' },
    ipHash: { type: String, default: '' },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export const Session = mongoose.model('Session', sessionSchema);
