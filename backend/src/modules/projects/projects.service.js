import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { env } from '../../config/env.js';
import { sendEmailInBackground } from '../../services/email.service.js';
import { DEFAULT_ROLES } from '../../constants/permissions.js';
import { stageLabel } from '../../constants/projects.js';

export const site = () => env.clientUrls[0].replace(/\/+$/, '');
export const portalProjectLink = (project) => `${site()}/portal/projects/${project._id}`;
export const adminProjectLink = (project) => `${site()}/admin/projects/${project._id}`;

/** The Client role (created on demand if the database was seeded before Stage 4). */
export async function getClientRole() {
  let role = await Role.findOne({ key: 'client' });
  if (!role) role = await Role.create(DEFAULT_ROLES.find((r) => r.key === 'client'));
  return role;
}

/** Who on the staff side hears about client activity: the project manager, else the enquiry notification list. */
export async function staffRecipientsFor(project) {
  if (project.manager) {
    const manager = await User.findOne({ _id: project.manager, status: 'active' }).select('email');
    if (manager) return [manager.email];
  }
  const settings = await SiteSettings.getMain();
  const configured = settings.notifications?.enquiryEmails;
  return configured?.length ? configured : env.staffNotificationEmails;
}

const personName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

/* ───────── Serializers ───────── */

export function projectOut(p, { forClient = false } = {}) {
  const out = {
    id: p._id,
    reference: p.reference,
    title: p.title,
    summary: p.summary,
    serviceTitle: p.serviceTitle,
    stage: p.stage,
    stageLabel: stageLabel(p.stage),
    status: p.status,
    startDate: p.startDate,
    dueDate: p.dueDate,
    lastActivityAt: p.lastActivityAt,
    stageHistory: (p.stageHistory || []).map((h) => ({ stage: h.stage, at: h.at })),
    manager: p.manager && p.manager.firstName ? { id: p.manager._id, name: personName(p.manager), email: forClient ? undefined : p.manager.email } : null,
    createdAt: p.createdAt,
  };
  if (!forClient) {
    out.client = p.client && p.client.firstName
      ? { id: p.client._id, name: personName(p.client), email: p.client.email, organization: p.client.organization, status: p.client.status }
      : p.client;
    out.visibleToClient = p.visibleToClient;
    out.awaitingStaffReply = p.awaitingStaffReply;
  }
  return out;
}

export function messageOut(m) {
  return {
    id: m._id,
    body: m.body,
    fromClient: m.fromClient,
    internal: m.internal,
    system: m.system,
    author: m.author && m.author.firstName ? { name: personName(m.author), photo: m.author.photo } : null,
    createdAt: m.createdAt,
  };
}

export function deliverableOut(d) {
  return {
    id: d._id,
    title: d.title,
    description: d.description,
    link: d.link,
    previewImage: d.previewImage?.url ? d.previewImage : null,
    version: d.version,
    status: d.status,
    dueDate: d.dueDate,
    decisions: (d.decisions || []).map((x) => ({ id: x._id, version: x.version, decision: x.decision, comment: x.comment, at: x.at, by: x.by && x.by.firstName ? personName(x.by) : undefined })),
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  };
}

/* ───────── Emails to the client ───────── */

export async function emailClient(project, template, data) {
  const client = await User.findOne({ _id: project.client, status: 'active' }).select('email firstName');
  if (!client || !project.visibleToClient) return;
  sendEmailInBackground({
    to: client.email,
    template,
    data: { firstName: client.firstName, projectTitle: project.title, link: portalProjectLink(project), ...data },
    relatedType: 'Project',
    relatedId: project._id,
  });
}