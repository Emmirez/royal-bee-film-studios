/** Talent portal (Stage 4C): roster, casting calls and bookings. */
export const TALENT_TYPES = [
  { key: 'actor', label: 'Actor' },
  { key: 'model', label: 'Model' },
  { key: 'voice', label: 'Voice artist' },
  { key: 'presenter', label: 'Presenter / host' },
  { key: 'dancer', label: 'Dancer' },
  { key: 'musician', label: 'Musician / singer' },
  { key: 'extra', label: 'Extra / background' },
  { key: 'crew', label: 'Crew' },
  { key: 'other', label: 'Other' },
];
export const TALENT_TYPE_KEYS = TALENT_TYPES.map((t) => t.key);
export const talentTypeLabel = (key) => TALENT_TYPES.find((t) => t.key === key)?.label || key;

/** pending = applied on the website and waiting for review. */
export const TALENT_STATUSES = ['pending', 'approved', 'rejected', 'archived'];
export const AVAILABILITY = ['available', 'limited', 'unavailable'];

export const CASTING_STATUSES = ['draft', 'open', 'closed'];
export const CASTING_APPLICATION_STATUSES = ['applied', 'shortlisted', 'booked', 'declined', 'withdrawn'];

/** offered → talent confirms or declines; staff can cancel or mark completed. */
export const BOOKING_STATUSES = ['offered', 'confirmed', 'declined', 'cancelled', 'completed'];

export const DOCUMENT_KINDS = [
  { key: 'contract', label: 'Contract' },
  { key: 'release', label: 'Release form' },
  { key: 'id', label: 'ID document' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'other', label: 'Other' },
];
export const DOCUMENT_KIND_KEYS = DOCUMENT_KINDS.map((d) => d.key);

export const MAX_TALENT_PHOTOS = 12;