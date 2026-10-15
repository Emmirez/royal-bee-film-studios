import mongoose from 'mongoose';
import { CASTING_APPLICATION_STATUSES, CASTING_STATUSES, TALENT_TYPE_KEYS } from '../constants/talent.js';

const { ObjectId } = mongoose.Schema.Types;

/** A casting call shown to approved talent in their portal. */
const castingCallSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    requirements: { type: String, trim: true, maxlength: 2000, default: '' },
    talentTypes: { type: [{ type: String, enum: TALENT_TYPE_KEYS }], default: [] },
    project: { type: ObjectId, ref: 'Project', default: null },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    shootDates: { type: String, trim: true, maxlength: 160, default: '' },
    fee: { type: String, trim: true, maxlength: 160, default: '' },
    applyBy: { type: Date, default: null },
    status: { type: String, enum: CASTING_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const CastingCall = mongoose.model('CastingCall', castingCallSchema);

/** One talent's application to a casting call. */
const castingApplicationSchema = new mongoose.Schema(
  {
    casting: { type: ObjectId, ref: 'CastingCall', required: true, index: true },
    talent: { type: ObjectId, ref: 'TalentProfile', required: true, index: true },
    note: { type: String, trim: true, maxlength: 1500, default: '' },
    status: { type: String, enum: CASTING_APPLICATION_STATUSES, default: 'applied', index: true },
    staffNote: { type: String, trim: true, maxlength: 1500, default: '' },
    booking: { type: ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true },
);
castingApplicationSchema.index({ casting: 1, talent: 1 }, { unique: true });

export const CastingApplication = mongoose.model('CastingApplication', castingApplicationSchema);