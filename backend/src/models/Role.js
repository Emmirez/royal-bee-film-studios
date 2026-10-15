import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9_]+$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    portal: { type: String, enum: ['staff', 'client', 'talent'], default: 'staff' },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false },
    requiresMfa: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Role = mongoose.model('Role', roleSchema);
