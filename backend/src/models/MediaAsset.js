import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image', index: true },
    deliveryType: { type: String, enum: ['upload', 'authenticated', 'private'], default: 'upload' },
    access: { type: String, enum: ['public', 'private'], default: 'public' },
    url: { type: String, required: true },
    format: String,
    width: Number,
    height: Number,
    bytes: Number,
    duration: Number,
    originalFilename: { type: String, default: '' },
    folder: { type: String, default: '', index: true },
    tags: { type: [String], default: [] },
    alt: { type: String, trim: true, maxlength: 250, default: '' },
    caption: { type: String, trim: true, maxlength: 300, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ originalFilename: 'text', alt: 'text', caption: 'text', tags: 'text' });

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
