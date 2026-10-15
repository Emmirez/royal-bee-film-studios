import jwt from 'jsonwebtoken';
import { Enquiry } from '../../models/Enquiry.js';
import { EnquiryDraft, FunnelStat } from '../../models/EnquiryDraft.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { Service } from '../../models/Service.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { PartnerPage } from '../../models/PartnerPage.js';
import { PARTNERSHIP_TYPES } from '../../constants/partner.js';
import { nextReference } from '../../models/Counter.js';
import { publicVisibilityFilter } from '../../constants/content.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, clientIp } from '../../utils/http.js';
import { randomToken, sha256, hashIp, safeEqual } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { spamReason } from '../../services/spam.service.js';
import { upsertContactFromSubmission } from '../../services/crm.service.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { uploadBuffer, folderPath } from '../../services/media.service.js';

const ATTACHMENT_AUDIENCE = 'royal-bee-enquiry-attachment';

/** Silently accept spam so bots get no signal, but store nothing. */
function fakeSuccess(res, kind) {
  return created(res, kind === 'enquiry' ? { reference: 'RBF-ENQ-RECEIVED', received: true } : { received: true });
}

async function staffRecipients(kind) {
  const settings = await SiteSettings.getMain();
  const configured = kind === 'enquiry' ? settings.notifications?.enquiryEmails : settings.notifications?.contactEmails;
  return configured?.length ? configured : env.staffNotificationEmails;
}

/* ───────── Attachments ───────── */

/**
 * Uploads one attachment privately (Cloudinary "authenticated" delivery) and
 * returns a signed token. The enquiry submit only accepts these tokens, so
 * visitors can't attach arbitrary files they didn't upload.
 */
export async function uploadAttachment(req, res) {
  if (!req.file) throw ApiError.badRequest('Choose a file to upload');
  const result = await uploadBuffer(req.file.buffer, {
    folder: folderPath('enquiries'),
    resourceType: req.file.mimetype.startsWith('image/') ? 'image' : 'raw',
    deliveryType: 'authenticated',
    tags: ['enquiry-attachment'],
  });
  const meta = {
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || '',
    name: req.file.originalname.slice(0, 200),
    size: req.file.size,
    mimeType: req.file.mimetype,
  };
  const token = jwt.sign(meta, env.jwtAccessSecret, { expiresIn: '24h', audience: ATTACHMENT_AUDIENCE });
  return created(res, { token, name: meta.name, size: meta.size, mimeType: meta.mimeType });
}

function readAttachmentTokens(tokens = []) {
  const seen = new Set();
  return tokens
    .map((t) => {
      try {
        const { publicId, resourceType, format, name, size, mimeType } = jwt.verify(t, env.jwtAccessSecret, { audience: ATTACHMENT_AUDIENCE });
        return { publicId, resourceType, format, name, size, mimeType };
      } catch {
        throw ApiError.badRequest('One of your attachments has expired. Please upload it again.');
      }
    })
    .filter((a) => !seen.has(a.publicId) && seen.add(a.publicId));
}

/* ───────── Enquiry submission ───────── */

export async function submitEnquiry(req, res) {
  const b = req.body;
  if (spamReason({ honeypot: b.website, formStartedAt: b.formStartedAt, text: b.description })) {
    logger.info({ reason: 'spam' }, 'Enquiry rejected by spam filter');
    return fakeSuccess(res, 'enquiry');
  }

  let service = null;
  if (b.serviceId) {
    service = await Service.findOne({ _id: b.serviceId, ...publicVisibilityFilter() }).select('title slug enquiryQuestions').lean();
    if (!service) throw ApiError.validation([{ path: 'serviceId', message: 'Please choose a service from the list' }]);
  }

  // Validate service-specific conditional questions: keep only known keys, enforce required ones.
  const answers = {};
  const issues = [];
  for (const q of service?.enquiryQuestions || []) {
    const value = b.answers?.[q.key];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    if (q.required && empty) issues.push({ path: `answers.${q.key}`, message: `${q.label} is required` });
    if (!empty && ['select'].includes(q.type) && q.options?.length && !q.options.includes(value)) {
      issues.push({ path: `answers.${q.key}`, message: `Choose a valid option for ${q.label}` });
    }
    if (!empty) answers[q.key] = value;
  }
  if (issues.length) throw ApiError.validation(issues);

  const attachments = readAttachmentTokens(b.attachmentTokens);
  const settings = await SiteSettings.getMain();

  // Possible duplicate: same email + same service within 24 hours (flagged, not blocked).
  const duplicate = await Enquiry.findOne({
    'contact.email': b.email,
    service: service?._id || null,
    createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
  })
    .select('_id')
    .lean();

  const { contact } = await upsertContactFromSubmission({
    name: b.name,
    email: b.email,
    phone: b.phone,
    organization: b.organization,
    serviceId: service?._id,
    marketingConsent: b.marketingConsent,
    preferredContactMethod: b.preferredContactMethod,
    source: b.utm?.source ? `website:${b.utm.source}` : 'website',
    utm: b.utm,
  });

  const reference = await nextReference('ENQ');
  const enquiry = await Enquiry.create({
    reference,
    contact: { name: b.name, email: b.email, phone: b.phone, organization: b.organization },
    service: service?._id || null,
    serviceTitle: service?.title || '',
    projectTitle: b.projectTitle,
    description: b.description,
    budgetRange: b.budgetRange,
    budgetAmount: b.budgetAmount ?? null,
    currency: settings.enquiry?.currency || 'NGN',
    preferredDates: { start: b.preferredStartDate || undefined, end: b.preferredEndDate || undefined, flexible: b.datesFlexible },
    location: b.location,
    deliverables: b.deliverables,
    answers,
    attachments,
    preferredContactMethod: b.preferredContactMethod,
    consent: { privacyAccepted: true, marketing: b.marketingConsent, at: new Date() },
    source: { page: b.sourcePage, referrer: (req.get('referer') || '').slice(0, 300), utm: b.utm },
    crmContact: contact._id,
    possibleDuplicateOf: duplicate?._id || null,
    history: [{ action: 'submitted', to: 'new' }],
    ipHash: hashIp(clientIp(req)),
  });

  await contact.updateOne({
    $push: {
      activity: {
        $each: [{ type: 'enquiry_submitted', summary: `${reference}${service ? ` — ${service.title}` : ''}`, refType: 'Enquiry', refId: String(enquiry._id), at: new Date() }],
        $slice: -200,
      },
    },
    $inc: { enquiryCount: 1 },
  });

  if (b.draftToken) await EnquiryDraft.deleteOne({ tokenHash: sha256(b.draftToken) });
  await bumpFunnel({ event: 'submit', step: 0, service: service?.slug || 'any' });

  sendEmailInBackground({
    to: b.email,
    template: 'enquiryReceived',
    data: { name: b.name, reference, serviceTitle: service?.title },
    idempotencyKey: `enquiry-received:${enquiry._id}`,
    relatedType: 'Enquiry',
    relatedId: enquiry._id,
  });
  const staff = await staffRecipients('enquiry');
  if (staff.length) {
    sendEmailInBackground({
      to: staff,
      template: 'enquiryStaffAlert',
      data: {
        reference,
        name: b.name,
        email: b.email,
        serviceTitle: service?.title,
        budget: b.budgetRange || (b.budgetAmount ? `${b.budgetAmount}` : ''),
        adminLink: `${env.clientUrls[0]}/admin/enquiries/${enquiry._id}`,
      },
      idempotencyKey: `enquiry-staff:${enquiry._id}`,
      relatedType: 'Enquiry',
      relatedId: enquiry._id,
    });
  }

  return created(res, { reference, received: true, submittedAt: enquiry.createdAt });
}

/* ───────── Drafts (save & resume) ───────── */

export async function saveDraft(req, res) {
  const { token, email, step, data, sendResumeLink } = req.body;
  const settings = await SiteSettings.getMain();
  const days = settings.enquiry?.draftExpiryDays || 14;
  const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);

  // Strip anything that must never be stored in a draft.
  const clean = { ...data };
  delete clean.attachmentTokens;
  delete clean.website;

  if (token) {
    const draft = await EnquiryDraft.findOne({ tokenHash: sha256(token) });
    if (draft && safeEqual(draft.email, email)) {
      draft.set({ step, data: clean, expiresAt });
      await draft.save();
      return ok(res, { token, expiresAt });
    }
  }

  const newToken = randomToken(32);
  await EnquiryDraft.create({ tokenHash: sha256(newToken), email, step, data: clean, expiresAt });
  if (sendResumeLink) {
    sendEmailInBackground({
      to: email,
      template: 'enquiryResumeLink',
      data: { link: `${env.clientUrls[0]}/enquire?resume=${encodeURIComponent(newToken)}`, expiresDays: days },
    });
  }
  return created(res, { token: newToken, expiresAt });
}

export async function resumeDraft(req, res) {
  const { token, email } = req.body;
  const draft = await EnquiryDraft.findOne({ tokenHash: sha256(token) });
  const invalid = ApiError.notFound('We could not find a saved enquiry for that link and email. It may have expired.');
  if (!draft || draft.expiresAt < new Date()) throw invalid;
  if (!safeEqual(draft.email, email)) {
    draft.failedAttempts += 1;
    if (draft.failedAttempts >= 5) await draft.deleteOne();
    else await draft.save();
    throw invalid;
  }
  return ok(res, { step: draft.step, data: { ...draft.data, email: draft.email }, expiresAt: draft.expiresAt });
}

/* ───────── Funnel analytics (aggregate only) ───────── */

async function bumpFunnel({ event, step, service }) {
  const date = new Date().toISOString().slice(0, 10);
  await FunnelStat.updateOne(
    { date, service: String(service || 'any').slice(0, 90), event, step: event === 'step' ? step : 0 },
    { $inc: { count: 1 } },
    { upsert: true },
  ).catch(() => {});
}

export async function trackFunnel(req, res) {
  await bumpFunnel(req.body);
  return res.status(204).end();
}

/* ───────── General contact form ───────── */

export async function submitContactMessage(req, res) {
  const b = req.body;
  if (spamReason({ honeypot: b.website, formStartedAt: b.formStartedAt, text: b.message })) {
    return fakeSuccess(res, 'contact');
  }
  const { contact } = await upsertContactFromSubmission({
    name: b.name,
    email: b.email,
    phone: b.phone,
    marketingConsent: b.marketingConsent,
    source: 'website:contact_form',
  });
  const message = await ContactMessage.create({
    name: b.name,
    email: b.email,
    phone: b.phone,
    subject: b.subject,
    message: b.message,
    consent: { privacyAccepted: true, marketing: b.marketingConsent, at: new Date() },
    crmContact: contact._id,
    ipHash: hashIp(clientIp(req)),
  });
  await contact.updateOne({
    $push: {
      activity: {
        $each: [{ type: 'contact_message', summary: b.subject || 'Contact form message', refType: 'ContactMessage', refId: String(message._id), at: new Date() }],
        $slice: -200,
      },
    },
  });

  sendEmailInBackground({ to: b.email, template: 'contactReceived', data: { name: b.name }, idempotencyKey: `contact-ack:${message._id}` });
  const staff = await staffRecipients('contact');
  if (staff.length) {
    sendEmailInBackground({
      to: staff,
      template: 'contactStaffAlert',
      data: { name: b.name, email: b.email, subject: b.subject, message: b.message },
      idempotencyKey: `contact-staff:${message._id}`,
    });
  }
  return created(res, { received: true });
}


/* ───────── Partner with us ───────── */

/**
 * "Partner with us" proposals are stored as enquiries with kind "partnership",
 * so staff manage them in Admin → Enquiries alongside project enquiries.
 */
export async function submitPartnership(req, res) {
  const b = req.body;
  if (spamReason({ honeypot: b.website, formStartedAt: b.formStartedAt, text: b.message })) {
    logger.info({ reason: 'spam' }, 'Partnership proposal rejected by spam filter');
    return created(res, { reference: 'RBF-PTN-RECEIVED', received: true });
  }

  // Partnership types come from the published Partner page (or the defaults)
  const page = await PartnerPage.findOne({ key: 'main' }).select('published').lean();
  const types = page?.published?.types?.length ? page.published.types : PARTNERSHIP_TYPES;
  const type = types.find((t) => t.key === b.partnershipType);
  if (!type) throw ApiError.validation([{ path: 'partnershipType', message: 'Choose a partnership type from the list' }]);

  const { contact } = await upsertContactFromSubmission({
    name: b.name,
    email: b.email,
    phone: b.phone,
    organization: b.organization,
    marketingConsent: b.marketingConsent,
    source: 'website:partner_form',
  });

  const reference = await nextReference('PTN');
  const enquiry = await Enquiry.create({
    reference,
    kind: 'partnership',
    contact: { name: b.name, email: b.email, phone: b.phone, organization: b.organization },
    serviceTitle: `Partnership · ${type.title}`,
    projectTitle: `Partnership proposal${b.organization ? ` — ${b.organization}` : ''}`,
    description: b.message,
    answers: {
      partnership_type: type.title,
      ...(b.companyWebsite ? { company_website: b.companyWebsite } : {}),
    },
    consent: { privacyAccepted: true, marketing: b.marketingConsent, at: new Date() },
    source: { page: '/partner', referrer: (req.get('referer') || '').slice(0, 300) },
    crmContact: contact._id,
    history: [{ action: 'submitted', to: 'new' }],
    ipHash: hashIp(clientIp(req)),
  });

  await contact.updateOne({
    $push: {
      activity: {
        $each: [{ type: 'enquiry_submitted', summary: `${reference} — Partnership: ${type.title}`, refType: 'Enquiry', refId: String(enquiry._id), at: new Date() }],
        $slice: -200,
      },
    },
    $inc: { enquiryCount: 1 },
  });

  sendEmailInBackground({
    to: b.email,
    template: 'partnershipReceived',
    data: { name: b.name, reference, typeTitle: type.title },
    idempotencyKey: `partnership-received:${enquiry._id}`,
    relatedType: 'Enquiry',
    relatedId: enquiry._id,
  });
  const staff = await staffRecipients('enquiry');
  if (staff.length) {
    sendEmailInBackground({
      to: staff,
      template: 'partnershipStaffAlert',
      data: {
        reference,
        name: b.name,
        email: b.email,
        organization: b.organization,
        typeTitle: type.title,
        adminLink: `${env.clientUrls[0]}/admin/enquiries/${enquiry._id}`,
      },
      idempotencyKey: `partnership-staff:${enquiry._id}`,
      relatedType: 'Enquiry',
      relatedId: enquiry._id,
    });
  }

  return created(res, { reference, received: true, submittedAt: enquiry.createdAt });
}
