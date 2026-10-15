/**
 * Permission catalog.
 * Permissions are granular strings "<area>.<action>". Roles hold a list of them.
 * Job titles are stored on the user and are NEVER used for authorization.
 * Later stages add more areas (projects, finance, etc.) to this catalog.
 */
export const PERMISSIONS = {
  // Website content (CMS)
  CMS_VIEW: 'cms.view',
  CMS_EDIT: 'cms.edit',
  CMS_APPROVE: 'cms.approve',
  CMS_PUBLISH: 'cms.publish',
  CMS_DELETE: 'cms.delete',

  // Media library
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',

  // Enquiries, contact messages and CRM
  ENQUIRIES_VIEW: 'enquiries.view',
  ENQUIRIES_MANAGE: 'enquiries.manage',
  ENQUIRIES_ASSIGN: 'enquiries.assign',
  ENQUIRIES_EXPORT: 'enquiries.export',
  CRM_VIEW: 'crm.view',
  CRM_MANAGE: 'crm.manage',

  // Staff and access control
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',

  // Client projects & client portal accounts
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_MANAGE: 'projects.manage',
  CLIENTS_MANAGE: 'clients.manage',

  // Invoices & quotes (records only — payment happens off the website)
  INVOICES_VIEW: 'invoices.view',
  INVOICES_MANAGE: 'invoices.manage',

  // Talent roster, casting calls and bookings
  TALENT_VIEW: 'talent.view',
  TALENT_MANAGE: 'talent.manage',

  // Administration
  SETTINGS_MANAGE: 'settings.manage',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  AUDIT_VIEW: 'audit.view',
  ANALYTICS_VIEW: 'analytics.view',
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Human-readable grouping for the role editor UI. */
export const PERMISSION_GROUPS = [
  {
    key: 'cms',
    label: 'Website content',
    permissions: [
      { key: PERMISSIONS.CMS_VIEW, label: 'View content in the CMS' },
      { key: PERMISSIONS.CMS_EDIT, label: 'Create and edit content' },
      { key: PERMISSIONS.CMS_APPROVE, label: 'Approve or reject content' },
      { key: PERMISSIONS.CMS_PUBLISH, label: 'Publish, schedule and unpublish content' },
      { key: PERMISSIONS.CMS_DELETE, label: 'Delete content' },
    ],
  },
  {
    key: 'media',
    label: 'Media library',
    permissions: [
      { key: PERMISSIONS.MEDIA_VIEW, label: 'View media library' },
      { key: PERMISSIONS.MEDIA_UPLOAD, label: 'Upload media' },
      { key: PERMISSIONS.MEDIA_DELETE, label: 'Delete media' },
    ],
  },
  {
    key: 'enquiries',
    label: 'Enquiries & CRM',
    permissions: [
      { key: PERMISSIONS.ENQUIRIES_VIEW, label: 'View enquiries and messages' },
      { key: PERMISSIONS.ENQUIRIES_MANAGE, label: 'Update enquiries and messages' },
      { key: PERMISSIONS.ENQUIRIES_ASSIGN, label: 'Assign enquiries to staff' },
      { key: PERMISSIONS.ENQUIRIES_EXPORT, label: 'Export enquiries' },
      { key: PERMISSIONS.CRM_VIEW, label: 'View CRM contacts' },
      { key: PERMISSIONS.CRM_MANAGE, label: 'Edit CRM contacts' },
    ],
  },
   {
    key: 'projects',
    label: 'Client projects',
    permissions: [
      { key: PERMISSIONS.PROJECTS_VIEW, label: 'View client projects' },
      { key: PERMISSIONS.PROJECTS_MANAGE, label: 'Create projects, post updates and deliverables' },
      { key: PERMISSIONS.CLIENTS_MANAGE, label: 'Invite and manage client portal accounts' },
    ],
  },
  {
    key: 'invoices',
    label: 'Invoices & quotes',
    permissions: [
      { key: PERMISSIONS.INVOICES_VIEW, label: 'View invoices, quotes and payments' },
          { key: PERMISSIONS.INVOICES_MANAGE, label: 'Create and send invoices/quotes, record payments, edit billing details' },
    ],
  },
  {
    key: 'talent',
    label: 'Talent & casting',
    permissions: [
      { key: PERMISSIONS.TALENT_VIEW, label: 'View the talent roster, castings, bookings and talent documents' },
      { key: PERMISSIONS.TALENT_MANAGE, label: 'Approve talent, run casting calls, make bookings and share documents' },
    ],
  },
  {
    key: 'users',
    label: 'Staff & access',
    permissions: [
      { key: PERMISSIONS.USERS_VIEW, label: 'View staff accounts' },
      { key: PERMISSIONS.USERS_MANAGE, label: 'Invite, edit and deactivate staff' },
      { key: PERMISSIONS.ROLES_MANAGE, label: 'Create and edit roles' },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    permissions: [
      { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage studio settings' },
      { key: PERMISSIONS.INTEGRATIONS_MANAGE, label: 'Manage integrations' },
      { key: PERMISSIONS.AUDIT_VIEW, label: 'View audit trail' },
      { key: PERMISSIONS.ANALYTICS_VIEW, label: 'View website analytics' },
    ],
  },
];

const P = PERMISSIONS;

/** Default roles created by the seed script. Super Admin bypasses checks via `isSuperAdmin`. */
export const DEFAULT_ROLES = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to every module. MFA is mandatory.',
    portal: 'staff',
    isSystem: true,
    isSuperAdmin: true,
    requiresMfa: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Manages content, enquiries and staff day-to-day.',
    portal: 'staff',
    isSystem: true,
    requiresMfa: false,
    permissions: [
      P.CMS_VIEW, P.CMS_EDIT, P.CMS_APPROVE, P.CMS_PUBLISH, P.CMS_DELETE,
      P.MEDIA_VIEW, P.MEDIA_UPLOAD, P.MEDIA_DELETE,
      P.ENQUIRIES_VIEW, P.ENQUIRIES_MANAGE, P.ENQUIRIES_ASSIGN, P.ENQUIRIES_EXPORT,
      P.CRM_VIEW, P.CRM_MANAGE, P.USERS_VIEW, P.ANALYTICS_VIEW,
      P.PROJECTS_VIEW, P.PROJECTS_MANAGE, P.CLIENTS_MANAGE,
      P.INVOICES_VIEW, P.INVOICES_MANAGE,
      P.TALENT_VIEW, P.TALENT_MANAGE,
    ],
  },
  {
    key: 'content_editor',
    name: 'Content Editor',
    description: 'Drafts website content and submits it for approval.',
    portal: 'staff',
    isSystem: false,
    requiresMfa: false,
    permissions: [P.CMS_VIEW, P.CMS_EDIT, P.MEDIA_VIEW, P.MEDIA_UPLOAD],
  },
  {
    key: 'production_staff',
    name: 'Production Staff',
    description: 'Production crew. Website access is read-only.',
    portal: 'staff',
    isSystem: false,
    requiresMfa: false,
    permissions: [P.CMS_VIEW, P.MEDIA_VIEW],
  },
  {
    key: 'client',
    name: 'Client',
    description: 'Client portal account (Stage 4).',
    portal: 'client',
    isSystem: true,
    requiresMfa: false,
    permissions: [],
  },
  {
    key: 'talent',
    name: 'Talent',
    description: 'Talent portal account (Stage 4).',
    portal: 'talent',
    isSystem: true,
    requiresMfa: false,
    permissions: [],
  },
];

/** Pure helper used by middleware and tests. */
export function roleHasPermission(role, permission) {
  if (!role) return false;
  if (role.isSuperAdmin) return true;
  return Array.isArray(role.permissions) && role.permissions.includes(permission);
}

export function roleHasAll(role, permissions) {
  return permissions.every((p) => roleHasPermission(role, p));
}

export function roleHasAny(role, permissions) {
  return permissions.some((p) => roleHasPermission(role, p));
}
