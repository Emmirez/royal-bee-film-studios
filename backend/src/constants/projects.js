/** Production stages shown as a timeline to staff and clients (in order). */
export const PROJECT_STAGES = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'pre_production', label: 'Pre-production' },
  { key: 'production', label: 'Production' },
  { key: 'post_production', label: 'Post-production' },
  { key: 'review', label: 'Client review' },
  { key: 'delivered', label: 'Delivered' },
];
export const PROJECT_STAGE_KEYS = PROJECT_STAGES.map((s) => s.key);
export const stageLabel = (key) => PROJECT_STAGES.find((s) => s.key === key)?.label || key;

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'];
export const DELIVERABLE_STATUSES = ['awaiting_review', 'approved', 'changes_requested'];