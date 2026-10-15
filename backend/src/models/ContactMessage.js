import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, maxlength: 160, default: '' },
    message: { type: String, trim: true, required: true, maxlength: 5000 },
    consent: {
      privacyAccepted: { type: Boolean, required: true },
      marketing: { type: Boolean, default: false },
      at: { type: Date, default: Date.now },
    },
    status: { type: String, enum: ['new', 'read', 'replied', 'archived', 'spam'], default: 'new', index: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    crmContact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    ipHash: { type: String, default: '', select: false },
  },
  { timestamps: true },
);

contactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
