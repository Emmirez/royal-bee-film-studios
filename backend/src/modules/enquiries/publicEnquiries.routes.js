import { Router } from 'express';
import { asyncHandler } from '../../utils/http.js';
import { validate } from '../../middleware/validate.js';
import { publicFormLimiter, publicUploadLimiter, trackingLimiter } from '../../middleware/rateLimiters.js';
import { enquiryAttachmentUpload } from '../../middleware/upload.js';
import * as c from './publicEnquiries.controller.js';
import * as v from './enquiries.validation.js';

/** Public (no login) enquiry + contact endpoints, mounted under /public. */
const router = Router();

router.post('/enquiries', publicFormLimiter, validate(v.submitEnquirySchema), asyncHandler(c.submitEnquiry));
router.post('/enquiries/attachments', publicUploadLimiter, enquiryAttachmentUpload.single('file'), asyncHandler(c.uploadAttachment));
router.post('/enquiries/drafts', publicFormLimiter, validate(v.saveDraftSchema), asyncHandler(c.saveDraft));
router.post('/enquiries/drafts/resume', publicFormLimiter, validate(v.resumeDraftSchema), asyncHandler(c.resumeDraft));
router.post('/enquiries/funnel', trackingLimiter, validate(v.funnelSchema), asyncHandler(c.trackFunnel));
router.post('/partner', publicFormLimiter, validate(v.partnershipSchema), asyncHandler(c.submitPartnership));
router.post('/contact', publicFormLimiter, validate(v.contactMessageSchema), asyncHandler(c.submitContactMessage));

export default router;
