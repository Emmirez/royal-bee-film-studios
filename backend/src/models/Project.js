import mongoose from 'mongoose';
import { PROJECT_STAGE_KEYS, PROJECT_STATUSES } from '../constants/projects.js';

/** A client production project, followed by the client in the portal. */
const projectSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    summary: { type: String, trim: true, maxlength: 3000, default: '' },
    serviceTitle: { type: String, trim: true, maxlength: 120, default: '' },
    stage: { type: String, enum: PROJECT_STAGE_KEYS, default: 'briefing', index: true },
    status: { type: String, enum: PROJECT_STATUSES, default: 'active', index: true },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visibleToClient: { type: Boolean, default: true },
    /** True when the client's latest message hasn't been answered yet. */
    awaitingStaffReply: { type: Boolean, default: false, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    stageHistory: {
      type: [new mongoose.Schema({ stage: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { _id: false })],
      default: [],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

projectSchema.index({ title: 'text', reference: 'text' });

export const Project = mongoose.model('Project', projectSchema);