import mongoose from 'mongoose';

export const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'closed', 'spam'];

const attachmentSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'raw' },
    format: { type: String, default: '' },
    name: { type: String, trim: true, maxlength: 200, default: '' },
    size: Number,
    mimeType: String,
  },
  { _id: true },
);

const enquirySchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, required: true },
    /** 'project' = guided project enquiry, 'partnership' = Partner with us form */
    kind: { type: String, enum: ['project', 'partnership'], default: 'project', index: true },
    contact: {
      name: { type: String, trim: true, required: true, maxlength: 120 },
      email: { type: String, trim: true, lowercase: true, required: true },
      phone: { type: String, trim: true, default: '' },
      organization: { type: String, trim: true, maxlength: 160, default: '' },
    },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null, index: true },
    serviceTitle: { type: String, default: '' }, // snapshot at submission time
    projectTitle: { type: String, trim: true, maxlength: 160, default: '' },
    description: { type: String, trim: true, maxlength: 5000, required: true },
    budgetRange: { type: String, trim: true, default: '' },
    budgetAmount: { type: Number, min: 0, default: null },
    currency: { type: String, default: 'NGN' },
    preferredDates: {
      start: Date,
      end: Date,
      flexible: { type: Boolean, default: true },
    },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    deliverables: { type: [String], default: [] },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} }, // service-specific conditional answers
    attachments: { type: [attachmentSchema], default: [] },
    preferredContactMethod: { type: String, enum: ['email', 'phone', 'any'], default: 'email' },
    consent: {
      privacyAccepted: { type: Boolean, required: true },
      marketing: { type: Boolean, default: false },
      at: { type: Date, default: Date.now },
    },
    source: {
      page: { type: String, default: '' },
      referrer: { type: String, default: '' },
      utm: { source: String, medium: String, campaign: String },
    },

    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    followUpAt: { type: Date, default: null },
    crmContact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', index: true },
    possibleDuplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', default: null },
    notes: {
      type: [
        new mongoose.Schema(
          { text: { type: String, maxlength: 4000 }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } },
          { _id: true },
        ),
      ],
      default: [],
    },
    history: {
      type: [
        new mongoose.Schema(
          { action: String, from: String, to: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } },
          { _id: false },
        ),
      ],
      default: [],
    },
    ipHash: { type: String, default: '', select: false },
  },
  { timestamps: true },
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ 'contact.email': 1, createdAt: -1 });
enquirySchema.index({ reference: 'text', 'contact.name': 'text', 'contact.email': 'text', 'contact.organization': 'text', projectTitle: 'text' });

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
