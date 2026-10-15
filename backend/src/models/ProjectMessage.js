import mongoose from 'mongoose';

/** Project conversation: staff updates, client messages and internal staff notes. */
const projectMessageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fromClient: { type: Boolean, default: false },
    /** Internal notes are never shown to the client. */
    internal: { type: Boolean, default: false },
    /** Automatic messages, e.g. "Project moved to Post-production". */
    system: { type: Boolean, default: false },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true },
);

projectMessageSchema.index({ project: 1, createdAt: 1 });

export const ProjectMessage = mongoose.model('ProjectMessage', projectMessageSchema);