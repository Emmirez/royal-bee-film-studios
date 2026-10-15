import mongoose from 'mongoose';

/**
 * Factory for singleton content (hero, founder profile).
 * Staff edit `draft`; publishing copies draft → `published`.
 * The public site only ever reads `published`, so unpublished edits are
 * previewable by staff without leaking.
 */
export function makeSingletonModel(name, contentSchema) {
  const reviewEntry = new mongoose.Schema(
    {
      action: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    },
    { _id: false },
  );

  const schema = new mongoose.Schema(
    {
      key: { type: String, default: 'main', unique: true },
      draft: { type: contentSchema, default: () => ({}) },
      published: { type: contentSchema, default: null },
      reviewStatus: { type: String, enum: ['editing', 'in_review', 'approved'], default: 'editing' },
      hasUnpublishedChanges: { type: Boolean, default: true },
      publishedAt: { type: Date, default: null },
      publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      draftUpdatedAt: { type: Date, default: Date.now },
      draftUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewHistory: { type: [reviewEntry], default: [] },
    },
    { timestamps: true },
  );

  schema.statics.getMain = async function getMain() {
    return (await this.findOne({ key: 'main' })) || this.create({ key: 'main' });
  };

  return mongoose.model(name, schema);
}
