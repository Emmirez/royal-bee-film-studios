import { TRANSITIONS, CONTENT_STATUS } from '../constants/content.js';
import { roleHasPermission } from '../constants/permissions.js';
import { ApiError } from '../utils/ApiError.js';
import { SiteSettings } from '../models/SiteSettings.js';

export async function approvalRequired() {
  const settings = await SiteSettings.getMain();
  return settings.workflow?.contentApprovalRequired !== false;
}

/**
 * Pure rule check for a workflow transition.
 * Returns the target status or throws an ApiError.
 */
export function resolveTransition({ action, currentStatus, role, approvalIsRequired }) {
  const rule = TRANSITIONS[action];
  if (!rule) throw ApiError.badRequest(`Unknown action: ${action}`);
  if (!roleHasPermission(role, rule.permission)) throw ApiError.forbidden();

  let allowedFrom = rule.from;
  // Without mandatory approval, publishers may publish straight from draft or review.
  if (action === 'publish' && !approvalIsRequired) allowedFrom = ['draft', 'in_review', 'approved'];

  if (!allowedFrom.includes(currentStatus)) {
    const hint =
      action === 'publish' && approvalIsRequired
        ? ' Content must be approved before it can be published.'
        : '';
    throw ApiError.conflict(`Cannot ${action} content that is ${currentStatus.replace('_', ' ')}.${hint}`);
  }
  return rule.to;
}

/**
 * Who may edit content in a given status.
 * - draft / in_review / archived: cms.edit
 * - approved: cms.edit, but the edit sends it back to draft (re-approval needed)
 * - published: cms.publish (+ cms.approve when approval is required), edits go live and are audited
 */
export function editPolicy({ status, role, approvalIsRequired }) {
  if (!roleHasPermission(role, 'cms.edit')) throw ApiError.forbidden();
  if (status === CONTENT_STATUS.PUBLISHED) {
    const canEditLive =
      roleHasPermission(role, 'cms.publish') && (!approvalIsRequired || roleHasPermission(role, 'cms.approve'));
    if (!canEditLive) {
      throw ApiError.forbidden('This content is live. Ask a publisher to edit it, or unpublish it first.');
    }
    return { resetToDraft: false, liveEdit: true };
  }
  if (status === CONTENT_STATUS.APPROVED) return { resetToDraft: true, liveEdit: false };
  return { resetToDraft: false, liveEdit: false };
}
