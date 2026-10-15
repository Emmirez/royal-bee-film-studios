import mongoose from 'mongoose';
import { imageSchema } from './shared.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    photo: { type: imageSchema, default: undefined },
    jobTitle: { type: String, trim: true, default: '' }, // display only — NOT used for authorization
    department: { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, maxlength: 160, default: '' }, // client company name
    employmentStatus: {
      type: String,
      enum: ['full_time', 'part_time', 'contractor', 'freelance', 'intern', 'other'],
      default: 'full_time',
    },
    accountType: { type: String, enum: ['staff', 'client', 'talent'], default: 'staff' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    status: { type: String, enum: ['invited', 'active', 'deactivated'], default: 'invited', index: true },

    passwordHash: { type: String, select: false },
    passwordChangedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },
    lastLoginIpHash: { type: String, select: false },
    /** Incremented to invalidate every access token immediately (deactivate, password change). */
    tokenVersion: { type: Number, default: 0 },

    mfa: {
      enabled: { type: Boolean, default: false },
      secretEncrypted: { type: String, select: false },
      pendingSecretEncrypted: { type: String, select: false },
      recoveryCodeHashes: { type: [String], select: false, default: [] },
      enabledAt: { type: Date },
    },

    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      sidebarCollapsed: { type: Boolean, default: false },
      dashboardWidgets: { type: [String], default: undefined },
      tableColumns: { type: Map, of: [String], default: undefined },
      savedFilters: { type: Map, of: mongoose.Schema.Types.Mixed, default: undefined },
      emailNotifications: { type: Boolean, default: true },
    },

    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedAt: { type: Date },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.index({ firstName: 'text', lastName: 'text', email: 'text', jobTitle: 'text' });

/** Safe public representation — never includes hashes or secrets. */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const role = this.role && typeof this.role === 'object' && this.role.name
    ? {
        id: this.role._id,
        key: this.role.key,
        name: this.role.name,
        portal: this.role.portal,
        permissions: this.role.permissions,
        isSuperAdmin: this.role.isSuperAdmin,
        requiresMfa: this.role.requiresMfa,
      }
    : this.role;
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    photo: this.photo,
    jobTitle: this.jobTitle,
    department: this.department,
    organization: this.organization,
    employmentStatus: this.employmentStatus,
    accountType: this.accountType,
    role,
    status: this.status,
    mfaEnabled: Boolean(this.mfa?.enabled),
    lastLoginAt: this.lastLoginAt,
    preferences: this.preferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
