import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { AuthToken } from '../../models/AuthToken.js';
import { env } from '../../config/env.js';
import { DEFAULT_ROLES } from '../../constants/permissions.js';
import { talentTypeLabel } from '../../constants/talent.js';
import { IMAGE_TYPES, DOCUMENT_TYPES, makeUploader } from '../../middleware/upload.js';
import { randomToken, sha256 } from '../../utils/crypto.js';
import { sendEmail, sendEmailInBackground } from '../../services/email.service.js';
import { folderPath, uploadBuffer } from '../../services/media.service.js';
import { site, staffRecipientsFor } from '../projects/projects.service.js';

export { staffRecipientsFor };

export const talentLink = (path = '') => `${site()}/talent${path}`;
export const adminLink = (path = '') => `${site()}/admin${path}`;

/** Photos: JPG/PNG/WebP up to 10MB. Documents: PDF/Word or a photo of the document, up to 10MB. */
export const talentPhotoUpload = makeUploader({ types: IMAGE_TYPES.filter((t) => t !== 'image/gif'), maxSizeMb: 10 });
export const talentDocumentUpload = makeUploader({ types: [...DOCUMENT_TYPES, 'image/jpeg', 'image/png', 'image/webp'], maxSizeMb: 10 });

/** The Talent role (created on demand if the database was seeded before Stage 4). */
export async function getTalentRole() {
  let role = await Role.findOne({ key: 'talent' });
  if (!role) role = await Role.create(DEFAULT_ROLES.find((r) => r.key === 'talent'));
  return role;
}

const personName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');
export const displayName = (p) => p.stageName || personName(p);

/* ───────── Uploads ───────── */

/** Public-delivery image (shown in the portal and to staff). URLs are random and never listed publicly. */
export async function uploadTalentPhoto(file) {
  const result = await uploadBuffer(file.buffer, { folder: folderPath('talent'), resourceType: 'image', tags: ['talent-photo'] });
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, alt: '' };
}

/** Private document — only downloadable through short-lived signed links. */
export async function uploadTalentDocument(file) {
  const isImage = file.mimetype.startsWith('image/');
  const result = await uploadBuffer(file.buffer, {
    folder: folderPath('talent-documents'),
    resourceType: isImage ? 'image' : 'raw',
    deliveryType: 'authenticated',
    tags: ['talent-document'],
  });
  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || '',
    name: file.originalname.slice(0, 200),
    size: file.size,
    mimeType: file.mimetype,
  };
}

/* ───────── Invites ───────── */

export async function sendTalentInvite(req, user) {
  await AuthToken.updateMany({ user: user._id, type: 'invite', usedAt: null }, { usedAt: new Date() });
  const token = randomToken();
  const record = await AuthToken.create({
    user: user._id,
    type: 'invite',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.inviteExpiresHours * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  const link = `${site()}/accept-invite?token=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: user.email,
    template: 'talentInvite',
    data: { firstName: user.firstName, link, expiresHours: env.inviteExpiresHours },
    idempotencyKey: `talent-invite:${record._id}`,
    relatedType: 'User',
    relatedId: user._id,
  });
  return { emailStatus: result.status, inviteLink: result.sent ? undefined : link, expiresAt: record.expiresAt };
}

/* ───────── Emails ───────── */

/** Email a talent (only once they have an active or invited account, unless `force`). */
export async function emailTalent(profile, template, data = {}, { force = false } = {}) {
  let to = profile.email;
  let firstName = profile.firstName;
  if (profile.user) {
    const user = await User.findById(profile.user._id || profile.user).select('email firstName status');
    if (!user || user.status === 'deactivated') return;
    to = user.email;
    firstName = user.firstName;
  } else if (!force) return;
  sendEmailInBackground({ to, template, data: { firstName, ...data }, relatedType: 'TalentProfile', relatedId: profile._id });
}

export async function emailStaff(template, data, project = null) {
  const to = await staffRecipientsFor(project || {});
  if (to?.length) sendEmailInBackground({ to, template, data });
}

/* ───────── Serializers ───────── */

export function talentOut(p, { forTalent = false, summary = false } = {}) {
  const base = {
    id: p._id,
    reference: p.reference,
    status: p.status,
    name: personName(p),
    displayName: displayName(p),
    firstName: p.firstName,
    lastName: p.lastName,
    stageName: p.stageName,
    email: p.email,
    phone: p.phone,
    talentTypes: p.talentTypes,
    talentTypeLabels: (p.talentTypes || []).map(talentTypeLabel),
    city: p.city,
    country: p.country,
    photo: p.photos?.[0] || null,
    availability: p.availability,
    hasAccount: Boolean(p.user),
    accountStatus: p.user?.status,
    createdAt: p.createdAt,
  };
  if (summary) return base;
  const full = {
    ...base,
    bio: p.bio,
    languages: p.languages,
    skills: p.skills,
    gender: p.gender,
    playingAgeMin: p.playingAgeMin,
    playingAgeMax: p.playingAgeMax,
    heightCm: p.heightCm,
    build: p.build,
    hairColour: p.hairColour,
    eyeColour: p.eyeColour,
    photos: p.photos || [],
    showreels: p.showreels || [],
    dayRate: p.dayRate,
    rateNotes: p.rateNotes,
    updatedAt: p.updatedAt,
  };
  if (forTalent) return full;
  return {
    ...full,
    internalNotes: p.internalNotes,
    application: { message: p.application?.message, submittedAt: p.application?.submittedAt, ageConfirmed: p.application?.ageConfirmed },
    reviewedAt: p.reviewedAt,
    reviewedBy: p.reviewedBy?.firstName ? personName(p.reviewedBy) : undefined,
    rejectionReason: p.rejectionReason,
    userId: p.user?._id || p.user || null,
  };
}

export function castingOut(c, extra = {}) {
  return {
    id: c._id,
    reference: c.reference,
    title: c.title,
    description: c.description,
    requirements: c.requirements,
    talentTypes: c.talentTypes,
    talentTypeLabels: (c.talentTypes || []).map(talentTypeLabel),
    project: c.project?.title ? { id: c.project._id, title: c.project.title, reference: c.project.reference } : null,
    location: c.location,
    shootDates: c.shootDates,
    fee: c.fee,
    applyBy: c.applyBy,
    status: c.status,
    publishedAt: c.publishedAt,
    createdAt: c.createdAt,
    ...extra,
  };
}

export function applicationOut(a, { forTalent = false } = {}) {
  return {
    id: a._id,
    status: a.status,
    note: a.note,
    staffNote: forTalent ? undefined : a.staffNote,
    talent: !forTalent && a.talent?.firstName ? talentOut(a.talent, { summary: true }) : undefined,
    casting: a.casting?.title ? { id: a.casting._id, title: a.casting.title, reference: a.casting.reference, status: a.casting.status } : undefined,
    booking: a.booking || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function bookingOut(b, { forTalent = false } = {}) {
  return {
    id: b._id,
    reference: b.reference,
    role: b.role,
    details: b.details,
    startDate: b.startDate,
    endDate: b.endDate,
    callTime: b.callTime,
    location: b.location,
    fee: b.fee,
    status: b.status,
    respondedAt: b.respondedAt,
    declineReason: b.declineReason,
    cancelReason: b.cancelReason,
    talent: !forTalent && b.talent?.firstName ? talentOut(b.talent, { summary: true }) : undefined,
    project: b.project?.title ? { id: b.project._id, title: b.project.title, reference: b.project.reference } : null,
    casting: b.casting?.title ? { id: b.casting._id, title: b.casting.title } : null,
    awaitingStaffReply: forTalent ? undefined : b.awaitingStaffReply,
    lastActivityAt: b.lastActivityAt,
    createdAt: b.createdAt,
  };
}

export function bookingMessageOut(m) {
  return {
    id: m._id,
    body: m.body,
    fromClient: m.fromTalent, // same shape as project messages so the thread UI can be shared
    fromTalent: m.fromTalent,
    internal: m.internal,
    system: m.system,
    author: m.author?.firstName ? { name: personName(m.author), photo: m.author.photo } : null,
    createdAt: m.createdAt,
  };
}

export function documentOut(d) {
  return {
    id: d._id,
    kind: d.kind,
    title: d.title || d.file?.name,
    name: d.file?.name,
    size: d.file?.size,
    mimeType: d.file?.mimeType,
    fromTalent: d.fromTalent,
    booking: d.booking?.reference ? { id: d.booking._id, reference: d.booking.reference, role: d.booking.role } : d.booking || null,
    uploadedBy: d.uploadedBy?.firstName ? personName(d.uploadedBy) : undefined,
    createdAt: d.createdAt,
  };
}

export const dateText = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');