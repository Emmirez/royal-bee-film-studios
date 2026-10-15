import mongoose from 'mongoose';
import { imageSchema } from './shared.js';
import { DELIVERABLE_STATUSES } from '../constants/projects.js';

/**
 * Something the client reviews: a cut, poster, script, etc.
 * Files live wherever the studio shares them (Vimeo, YouTube, Google Drive, Frame.io…) — we store the link.
 */
const deliverableSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    link: { type: String, trim: true, maxlength: 1000, default: '' },
    previewImage: { type: imageSchema, default: undefined },
    version: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: DELIVERABLE_STATUSES, default: 'awaiting_review', index: true },
    dueDate: { type: Date, default: null },
    decisions: {
      type: [
        new mongoose.Schema(
          {
            version: Number,
            decision: { type: String, enum: ['approved', 'changes_requested'] },
            comment: { type: String, maxlength: 3000, default: '' },
            by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            at: { type: Date, default: Date.now },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Deliverable = mongoose.model('Deliverable', deliverableSchema);