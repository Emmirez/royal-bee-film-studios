import mongoose from 'mongoose';
import { BOOKING_STATUSES, DOCUMENT_KIND_KEYS } from '../constants/talent.js';
import { CURRENCIES } from '../constants/billing.js';

const { ObjectId } = mongoose.Schema.Types;

/** A job offered to (and confirmed by) a talent. */
const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    talent: { type: ObjectId, ref: 'TalentProfile', required: true, index: true },
    project: { type: ObjectId, ref: 'Project', default: null, index: true },
    casting: { type: ObjectId, ref: 'CastingCall', default: null },
    role: { type: String, required: true, trim: true, maxlength: 160 },
    details: { type: String, trim: true, maxlength: 3000, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    callTime: { type: String, trim: true, maxlength: 60, default: '' },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    fee: {
      amount: { type: Number, min: 0, default: null },
      currency: { type: String, enum: CURRENCIES, default: 'NGN' },
      note: { type: String, trim: true, maxlength: 200, default: '' },
    },
    status: { type: String, enum: BOOKING_STATUSES, default: 'offered', index: true },
    respondedAt: { type: Date, default: null },
    declineReason: { type: String, trim: true, maxlength: 1000, default: '' },
    cancelReason: { type: String, trim: true, maxlength: 1000, default: '' },
    awaitingStaffReply: { type: Boolean, default: false, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Booking = mongoose.model('Booking', bookingSchema);

/** Conversation on a booking between the studio and the talent. */
const bookingMessageSchema = new mongoose.Schema(
  {
    booking: { type: ObjectId, ref: 'Booking', required: true },
    author: { type: ObjectId, ref: 'User' },
    fromTalent: { type: Boolean, default: false },
    internal: { type: Boolean, default: false },
    system: { type: Boolean, default: false },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true },
);
bookingMessageSchema.index({ booking: 1, createdAt: 1 });

export const BookingMessage = mongoose.model('BookingMessage', bookingMessageSchema);

/** Private files (contracts, release forms, ID) — stored as Cloudinary "authenticated" assets. */
const talentDocumentSchema = new mongoose.Schema(
  {
    talent: { type: ObjectId, ref: 'TalentProfile', required: true, index: true },
    booking: { type: ObjectId, ref: 'Booking', default: null, index: true },
    kind: { type: String, enum: DOCUMENT_KIND_KEYS, default: 'other' },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    file: {
      publicId: { type: String, required: true },
      resourceType: { type: String, default: 'raw' },
      format: { type: String, default: '' },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: '' },
    },
    fromTalent: { type: Boolean, default: false },
    uploadedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const TalentDocument = mongoose.model('TalentDocument', talentDocumentSchema);