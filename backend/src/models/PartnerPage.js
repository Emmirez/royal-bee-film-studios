import mongoose from 'mongoose';
import { imageSchema } from './shared.js';
import { makeSingletonModel } from './singleton.js';
import { DEFAULT_PARTNER_PAGE as D } from '../constants/partner.js';

const typeSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, maxlength: 40, required: true },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
  },
  { _id: false },
);

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

/** "Partner with us" page — draft/published like the hero and founder profile. */
const partnerContent = new mongoose.Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 60, default: D.eyebrow },
    heading: { type: String, trim: true, maxlength: 160, default: D.heading },
    intro: { type: String, trim: true, maxlength: 600, default: D.intro },
    image: { type: imageSchema, default: () => ({ ...D.image }) },
    typesHeading: { type: String, trim: true, maxlength: 80, default: D.typesHeading },
    types: { type: [typeSchema], default: () => D.types.map((t) => ({ ...t })) },
    stepsHeading: { type: String, trim: true, maxlength: 80, default: D.stepsHeading },
    steps: { type: [stepSchema], default: () => D.steps.map((s) => ({ ...s })) },
    formHeading: { type: String, trim: true, maxlength: 120, default: D.formHeading },
    formIntro: { type: String, trim: true, maxlength: 300, default: D.formIntro },
    successMessage: { type: String, trim: true, maxlength: 300, default: D.successMessage },
  },
  { _id: false },
);

export const PartnerPage = makeSingletonModel('PartnerPage', partnerContent);