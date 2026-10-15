import mongoose from 'mongoose';

/**
 * Append-only audit trail. Update and delete operations are blocked at the
 * model level; protect the collection further at the database-user level in production.
 */
const auditEventSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: '', index: true },
    entityId: { type: String, default: '', index: true },
    summary: { type: String, default: '' },
    before: { type: mongoose.Schema.Types.Mixed, default: undefined },
    after: { type: mongoose.Schema.Types.Mixed, default: undefined },
    metadata: { type: mongoose.Schema.Types.Mixed, default: undefined },
    severity: { type: String, enum: ['info', 'notice', 'warning', 'critical'], default: 'info' },
    ipHash: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.index({ createdAt: -1 });

const blockMutation = function blockMutation(next) {
  next(new Error('Audit events are append-only'));
};
[
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
].forEach((op) => auditEventSchema.pre(op, blockMutation));

auditEventSchema.pre('save', function onlyNew(next) {
  if (!this.isNew) return next(new Error('Audit events are append-only'));
  return next();
});

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
