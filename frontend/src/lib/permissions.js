/** Mirrors the backend permission keys. The backend always re-checks — this only hides UI. */
export const P = {
  CMS_VIEW: 'cms.view',
  CMS_EDIT: 'cms.edit',
  CMS_APPROVE: 'cms.approve',
  CMS_PUBLISH: 'cms.publish',
  CMS_DELETE: 'cms.delete',
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  ENQUIRIES_VIEW: 'enquiries.view',
  ENQUIRIES_MANAGE: 'enquiries.manage',
  ENQUIRIES_ASSIGN: 'enquiries.assign',
  ENQUIRIES_EXPORT: 'enquiries.export',
  CRM_VIEW: 'crm.view',
  CRM_MANAGE: 'crm.manage',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  SETTINGS_MANAGE: 'settings.manage',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  AUDIT_VIEW: 'audit.view',
  ANALYTICS_VIEW: 'analytics.view',
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_MANAGE: 'projects.manage',
  CLIENTS_MANAGE: 'clients.manage',
  INVOICES_VIEW: 'invoices.view',
  INVOICES_MANAGE: 'invoices.manage',
  TALENT_VIEW: 'talent.view',
  TALENT_MANAGE: 'talent.manage',
};

export function hasPermission(user, permission) {
  const role = user?.role;
  if (!role) return false;
  if (role.isSuperAdmin) return true;
  return Array.isArray(role.permissions) && role.permissions.includes(permission);
}

export const hasAny = (user, perms) => perms.some((p) => hasPermission(user, p));
