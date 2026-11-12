/** Production stages — keep in step with PRODUCTION_STAGES in backend/src/constants/content.js. */
export const PRODUCTION_STAGES = [
  { value: 'in_development', label: 'In development', description: 'Script, rights or financing stage' },
  { value: 'pre_production', label: 'Pre-production', description: 'Casting, locations and planning' },
  { value: 'filming', label: 'Filming', description: 'Cameras are rolling' },
  { value: 'post_production', label: 'Post-production', description: 'Editing, sound and colour' },
  { value: 'coming_soon', label: 'Coming soon', description: 'Finished and awaiting release' },
  { value: 'released', label: 'Released', description: 'Out now — shown in the main portfolio' },
];

export const stageLabel = (value) => PRODUCTION_STAGES.find((s) => s.value === value)?.label || '';

export const isForthcoming = (p) => Boolean(p?.stage) && p.stage !== 'released';

/** "Coming 14 March 2027" when a date is set, else "Coming 2027", else "". */
export function releaseLabel(p) {
  if (p?.releaseDate) {
    const d = new Date(p.releaseDate);
    if (!Number.isNaN(d.getTime())) return `Coming ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return p?.year ? `Coming ${p.year}` : '';
}